import React, { Component } from 'react';
import { StyleSheet, Alert, Modal, TouchableOpacity, Text, View, Dimensions, } from 'react-native';
import { RNCamera } from 'react-native-camera';
import CameraButton from './CameraButton';
import axios from 'axios';
import Tts from 'react-native-tts';
import KeepAwake from 'react-native-keep-awake';
import  { YellowBox } from 'react-native';
import { Games } from './Urls';

YellowBox.ignoreWarnings(['Sending...']);
const TTSSTART = 'started';
const TTSFINISH = 'finished';
const TTSCANCEL = 'cancelled';

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      startLoopTime: null,
      pauseOrUnpause: 'unpause',
      keepLooping: true,
      loading: false,
      bearerToken: [],
      identifiedAs: '',
      initialTokenTime: null,
      mlresults: {
        payload: ["waiting for picture"]
      },
      ADN: [],
      cameraType : 'front',
      mirrorMode : false,
      shouldBeAwake: true,
      cameraPause: true,
      currentGameId: 0,
      currentGame: Games[0]
    }

    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: TTSSTART })
    );
    Tts.addEventListener("tts-finish", event =>
      this.setState({ ttsStatus: TTSFINISH })
    );
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: TTSCANCEL })
    );

    this.takePicture = this.takePicture.bind(this);
    this.speakResults = this.speakResults.bind(this);
    this.pauseCamera = this.pauseCamera.bind(this);
    this.pauseSwitch = this.pauseSwitch.bind(this);
    this.checkTimeToBreakLoop = this.checkTimeToBreakLoop.bind(this);
    this.getGame = this.getGame.bind(this);
    this.setGame = this.setGame.bind(this);
  }  

  pauseSwitch(camera) {
    if(this.state.pauseOrUnpause === 'unpause')
    {
      this.takePicture(camera)
      this.setState({pauseOrUnpause:'pause', keepLooping: true, startLoopTime: Date.now()})
    } else {
      this.setState({pauseOrUnpause: 'unpause', keepLooping: false})
    }
  }
 
  changeKeepAwake(shouldBeAwake) {    
    if (shouldBeAwake) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }
  }

  takePicture(camera) {    
    //camera.pausePreview(); // there is curretly a bug with pausePreview which causes takePictureAsync to fail if you call it on Android pre taking a picture
    this.setState({ loading: true });

    //Set the options for the camera
    const options = {
      base64: false
    };
    
    //Tts.speak("klurk")
    // Get the base64 version of the image
    camera.takePictureAsync(options)
      .then(data => {
        // data is your base64 string
        console.log("taking picture")        
        this.identifyImage(data.uri, camera);
      })
      .catch((error) => {
        // e is the error code
        console.log(error)
      })
      .finally(() => {
        //camera.resumePreview();
        this.setState({ loading: false }) // this will make the button clickable again
      })
  }

  pauseCamera(){
    //what is this actually doing??
    if ({loading: true}) {
      this.setState({loading: false})
    }    
  }

  componentDidMount() {
    //onload
    this.changeKeepAwake(true)
  }


  identifyImage(uri, camera) {
    this.setState({ loading: true });
    console.log("identifying image!")
    var data = new FormData();
    data.append('image', {uri: uri, name: 'test.jpg', type: 'image/jpg'});
    const currentGame = this.state.currentGame;
    console.log("sending")
    axios({      
      method: 'post',
      url: currentGame.url,
      headers: {
        "Content-Type": "multipart/form-data",
        "Prediction-Key": currentGame.key

      },
      data: data
    })
      .then((response) => {
        this.setState({ mlresults: response.data })
        console.log(response.data);
        console.log("setting mlresutls")
      })
      .catch((error) => {
        console.log(error.response)
      })
      .then(() => {
        this.speakResults(camera)
    
      })
      .catch((error) => {
        console.log(error)
      })      
  }

  checkTimeToBreakLoop(){    
    if(Date.now() > this.state.startLoopTime + 3000){
      console.log('break loop');
      this.setState({keepLooping: false, pauseOrUnpause: 'unpause'})
    }
  }

  speakResults(camera) {
      console.log("speak those results");
      Tts.speak(Math.round(this.state.mlresults.predictions[0].probability * 100) + " percent");
      Tts.speak(this.state.mlresults.predictions[0].tagName);
      setTimeout(() => {this.isFinished(camera)}, 1000);
      console.log(this.state.mlresults.predictions);
  }

  isFinished(camera) {
    const ttsStatus = this.state.ttsStatus;
    if ((ttsStatus === TTSFINISH || ttsStatus === TTSCANCEL) && this.state.keepLooping === true)
    {
      console.log('loopagain');
      setTimeout(() => {this.takePicture(camera)}, 1000);
    }
    else if (ttsStatus === TTSSTART)
    {
      setTimeout(() => {this.isFinished(camera)}, 1000);
    }
  }

  setGame(index)
  {
    this.setState({
      currentGameId: index,
      currentGame: Games[index]
    });
  }

  getGame(game, index) {
    let style = styles.game;
    if(index === this.state.currentGameId)
    {
      style = styles.gameSelected;
    }
    return (
      <View key={index}>
        <TouchableOpacity onPress={() => this.setGame(index)}>
          <Text style={style}>{game.name}</Text>
        </TouchableOpacity>
      </View>
    
    );
  }


//<View >{Alert.alert('How to use Card Whisperer','Hold a playing card over the phone and tap the top half of the screen to start the camera. Wait until your card is read and then hold your next card over the phone. The camera will contnuously take photos unless you tap the bottom half of the screen to pause. Tap the top half of the screen to start the camera again')}</View>

  render() {
    
    return (
      <View style={styles.container}>
                {Games.map((game, index) => {
            return (
              this.getGame(game, index)
            )
          })}
          <RNCamera 
            type={this.state.cameraType} mirrorImage={this.state.mirrorMode} 
            ref={ref => { this.camera = ref; }} style={styles.preview}>
            <CameraButton onClick={() => {this.pauseSwitch(this.camera)}} />
          </RNCamera>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    
    backgroundColor: 'white'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  game: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  gameSelected: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
    fontWeight: 'bold',
    backgroundColor: 'yellow'
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  loadingIndicator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});