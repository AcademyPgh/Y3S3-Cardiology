import React, { Component } from 'react';
import { StyleSheet, Alert, Modal, TouchableOpacity, Text, View, Dimensions, } from 'react-native';
import { RNCamera } from 'react-native-camera';
import CameraButton from './CameraButton';
import axios from 'axios';
import Tts from 'react-native-tts';
import KeepAwake from 'react-native-keep-awake';
import  { YellowBox } from 'react-native';
import PauseButton from './PauseButton';

YellowBox.ignoreWarnings(['Sending...']);

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
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
    }
    this.takePicture = this.takePicture.bind(this);
    this.speakResults = this.speakResults.bind(this);
    this.pauseCamera = this.pauseCamera.bind(this);
    this.pauseSwitch = this.pauseSwitch.bind(this);
  }  

  pauseSwitch(camera) {
    if(this.state.pauseOrUnpause === 'unpause')
    {
      this.takePicture(camera)
      this.setState({pauseOrUnpause:'pause', keepLooping: true})
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

  dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var arrayBuffer = new ArrayBuffer(byteString.length);
    var _ia = new Uint8Array(arrayBuffer);
    for (var i = 0; i < byteString.length; i++) {
        _ia[i] = byteString.charCodeAt(i);
    }

    var dataView = new DataView(arrayBuffer);
    var blob = new Blob([dataView], { type: mimeString });
    return blob;
  }

  takePicture(camera) {    
    //camera.pausePreview(); // there is curretly a bug with pausePreview which causes takePictureAsync to fail if you call it on Android pre taking a picture
    this.setState({ loading: true });

    //Set the options for the camera
    const options = {
      base64: false
    };
    
    Tts.speak("klurk")
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
    console.log("identifying image!")
    var data = new FormData();
    data.append('image', {uri: uri, name: 'test.jpg', type: 'image/jpg'});

    console.log("sending")
    axios({      
      method: 'post',
      url: "https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/1d9deceb-30ee-49fd-80f7-5e198d8cb309/image?iterationId=bddc0b5f-777d-4b15-86be-2c407179baa3",
      headers: {
        "Content-Type": "multipart/form-data",
        "Prediction-Key": "054801a27f9a49519e0db20c8bcc5a5c"
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
        this.speakResults()
        if(this.state.keepLooping === true) {
          this.takePicture(this.camera)
        }        
      })
      .catch((error) => {
        console.log(error)
      })      
  }

  speakResults() {
    console.log("speak those results");
    let ADN = [];
    ADN = this.state.mlresults.predictions.filter((element) =>
      element.probability > 0.9);
    console.log(ADN);
    let results = {}; 
    ADN.forEach((element) => {
      if (element.tagName == "J"){
          results.face = "Jack"
        }
        else if ( element.tagName == "A"){
          results.face = "Ace"
        }
        else if (element.tagName == "K"){
          results.face = "King"
        }
        else if (element.tagName == "Q"){
          results.face = "Queen"
        }
        else if (element.tagName.toLowerCase() == "heart") {
          results.suit = "Hearts"
        }
        else if (element.tagName.toLowerCase() == "diamond") {
          results.suit = "Diamonds"
        }
        else if (element.tagName.toLowerCase() == "spade") {
          results.suit = "Spades"
        }
        else if (element.tagName.toLowerCase() == "club") {
          results.suit = "Clubs"
        }
        else {
          if (element.tagName != "Face" && element.tagName != "Black" && element.tagName != "Red" )
          {  
            results.face = element.tagName
          }
        }
    });
    if(results.face === undefined)
    {
      results.face = "Unknown"
    }
    if(results.suit === undefined)
    {
      results.suit = "Unknown"
    }
    if(results.face !== "Unknown" && results.suit !== "Unknown")
    {
      Tts.speak(`${results.face} of ${results.suit}`)
    }
  }

//<View >{Alert.alert('How to use Card Whisperer','Hold a playing card over the phone and tap the top half of the screen to start the camera. Wait until your card is read and then hold your next card over the phone. The camera will contnuously take photos unless you tap the bottom half of the screen to pause. Tap the top half of the screen to start the camera again')}</View>

  render() {
    
    return (
      <View style={styles.container}>
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