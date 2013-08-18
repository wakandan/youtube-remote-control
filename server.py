#!/usr/bin/python
import gevent
from gevent import monkey; monkey.patch_all()
from gevent.pywsgi import WSGIServer
from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin
import bottle
from bottle import route, run, template, response, static_file
import subprocess
import shlex 
import os
from subprocess import Popen, PIPE
import pygst
pygst.require("0.10")
import gst
import urllib
import urllib2
import re
import sys
import gobject
import socketio

YOUTUBE2_MP3_LINK1 = "http://www.youtube-mp3.org/a/pushItem/?item=https://www.youtube.com/watch?v="
YOUTUBE2_MP3_LINK2 = "http://www.youtube-mp3.org/a/itemInfo/?video_id="
YOUTUBE2_MP3_LINK3 = "http://www.youtube-mp3.org/get?video_id=%s&h=%s"

class PlayerNamespace(BaseNamespace, RoomsMixin, BroadcastMixin):
    def on_addsong(self, song):
        self.request['player'].add_song(song)
        self.broadcast_event('songs', self.request['player'].playlist)

    def on_play(self, video):
        print self.request['player'].play(video['id'])

    def on_nickname(self, nickname):
        self.request['nicknames'].append(nickname)
        self.socket.session['nickname'] = nickname
        self.broadcast_event('announcement', '%s has connected' % nickname)
        self.broadcast_event('nicknames', self.request['nicknames'])
        # just have them join a default-named room
        self.join('main_room')

    def recv_disconnect(self):
        # remove nickname from the list.
        #nickname = self.socket.session['nickname']
        #self.request['nicknames'].remove(nickname)
        #self.broadcast_event('announcement', '%s has disconnected' % nickname)
        #self.broadcast_event('nicknames', self.request['nicknames'])

        self.disconnect(silent=True)

    def on_user_message(self, msg):
        self.emit_to_room('main_room', 'msg_to_room',
            self.socket.session['nickname'], msg)

    def recv_message(self, message):
        print "PING!!!", message

class SocketIOApp(object):
    def __init__(self):
        self.current_song = 0
        # Dummy request object to maintain state between Namespace initialization.
        self.playlist = []
        self.player = Player(self.about_to_finish_callback) 
        self.request = {
            'nicknames': [],
            'player': self
        }

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith('/socket.io'):
            #let this manage the global namespace
            socketio_manage(environ, {'': PlayerNamespace}, self.request)

    def about_to_finish_callback():
        self.play_next()

    def add_song(self, video):
        '''simple adding for now, smart playing later'''
        #duplicate?
        if video not in self.playlist: 
            self.playlist.append(video)

    def is_playing(self):
        return self.player.is_playing()

    def run(self):
        self.player.run()

    def stop(self):
        self.player.stop()

    def play(self, song_id):
        song_url = self.get_mp3_link(song_id)
        if song_url is not None:
            self.player.play(song_url)
        return (song_url is not None)

    def play_prev(self):
        '''play the previous song if there's any. No caching is done //TODO'''
        if self.current_song>0 and len(self.playlist)>0:
            self.current_song -= 1
            song_id = self.playlist[self.current_song].id
            song_url = self.get_mp3_link(song_id)
            if song_url is not None: 
                self.player.play(song_url)
            return song_url is not None 
        else:
            return False

    def play_next(self):
        '''play the next song if available. No caching is done here. //TODO'''
        if self.current_song<len(self.playlist)-1:
            self.current_song += 1
            song_id = self.playlist[self.current_song].id
            song_url = self.get_mp3_link(song_id)
            if song_url is not None: 
                self.player.play(song_url)
            return song_url is not None 
        else:
            return False

    def get_mp3_link(self, video_id):
        '''get mp3 link from a youtube video id using youtube2mp3 service'''
        try:
            print 'trying to get link for id', video_id
            response = urllib2.urlopen(YOUTUBE2_MP3_LINK1+video_id)
            data = response.read()
            #ignore this reponse and send the second request
            response = urllib2.urlopen(YOUTUBE2_MP3_LINK2+video_id)
            data = response.read()      
            result = re.search("[\w\d]{32}", data)
            #the video was converted
            if result is not None:
                hash_value = result.group(0)
                final_download_link =  YOUTUBE2_MP3_LINK3 % (video_id, hash_value)
                return final_download_link
            else:
                return None
        except urllib2.HTTPError, e:
             return None

class Player:
    '''play a mp3 file'''
    def __init__(self, about_to_finish_callback):           
        #this only works with playbin2
        self.player = gst.element_factory_make("playbin2", "player")
        self.player.connect("about-to-finish", about_to_finish_callback)

    def is_playing(self):
        return self.player.get_state()==gst.STATE_PLAYING

    def run(self):
        self.player.set_state(gst.STATE_PLAYING)

    def stop(self):
        self.player.set_state(gst.STATE_READY)

    def play(self, mp3_link):
        self.stop()
        self.player.set_property('uri', mp3_link)
        self.player.set_state(gst.STATE_PLAYING)

#creates a playbin (plays media form an uri) 
#player = Player()

def stop_playing_w_pipe():
    '''@depreciated'''
    '''just terminate all pipes'''
    global download_pipe 
    global mp3_pipe 


    if download_pipe is not None:
        download_pipe.terminate()

    if mp3_pipe is not None:
        mp3_pipe.terminate()


def play_mp3_link_w_pipe(mp3_link):
    '''@depreciated'''
    '''mp3 playing using pipeline'''
    if download_pipe is not None:
        download_pipe.terminate()
    print os.getcwd()+'/youtube2mp3_converter.py'
    download_pipe = Popen(['python', os.getcwd()+'/youtube2mp3_converter.py', url], stdout=PIPE) 

    if mp3_pipe is not None:
        mp3_pipe.terminate()
    mp3_pipe = Popen(shlex.split('mpg123 -'), stdin=download_pipe.stdout)   
    playing_check = mp3_pipe.poll()
    if playing_check is not None or playing_check!=0:
        print 'error while playing the file'
        return 'error while playing the file'

@route('/static/<path:re:.*>')
def serve_static(path):       
    if path=='':
        path = 'index.html'
    return static_file('app/'+path, root=os.getcwd())

@route('/')
def index():
    return static_file('app/index.html', root=os.getcwd())

@route('/stop', method=['OPTIONS', 'GET'])
def stop():
    player_app.stop()

@route('/play/<video_id>', method=['OPTIONS', 'GET'])
def play(video_id=''):
    if video_id!=None:
        player.add_song_id(video_id)
    else: 
        player.run()
    return "playing..." 

@route('/next', method=['OPTIONS', 'GET'])
def next():
    player_app.play_next()

@route('/prev', method=['OPTIONS', 'GET'])
def next():
    player_app.play_prev()

app = bottle.app()
player_app = SocketIOApp()

# setup server to handle webserver requests
http_server = WSGIServer(('', 8000), app)
# setup server to handle websocket requests
sio_server = SocketIOServer(
    ('0.0.0.0', 8080),
    player_app, 
    resource="socket.io",
    policy_server=True,
    policy_listener=('0.0.0.0', 10843)
)

gevent.joinall([
    gevent.spawn(http_server.serve_forever),
    gevent.spawn(sio_server.serve_forever)
])


