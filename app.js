/******************************************************************************
 * Application: InfiniteScrollingApp sample code
 * Author: Shankara Dash Shivagana
 * Company: Agora.io
 * Date: Feb 23rd
 * Description: 
 *
 *****************************************************************************/
class AgoraMultiChanelApp
{
  //C'tor: initialize Agora and Angular.
  constructor()
  {
    this.appId = "20b7c51ff4c644ab80cf5a4e646b0537";
    this.token = null;
    this.maxClients = 2;
    this.maxUsersPerChannel = 30;
    // We'll keep track of one client object per Agora channel to join.
    this.clients = [];
    this.numClients = 0;
    // We need to join one channel for every N (32?) hosts.
    this.channels = [];
    this.numChannels = 0;
    this.baseChannelName = "SA-MULTITEST";
    // Seperate video and audio tracks we can manage seperately.
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    // All clients will share the same config.
    this.clientConfig = {mode: "rtc", codec: "h264"};
    
    this.createClients();
    this.joinChannels();
  }

  createClients()
  {
    let i = 0;
    // Create the max number of client objects.
    for(i; i < this.maxClients; i++)
    {
      this.clients[i] = AgoraRTC.createClient(this.clientConfig);
      let currentClient = this.clients[i];      

      /* Each client object will need the same event handlers. */
      // Add the remote publish event
      this.clients[i].on("user-published", 
                         async (user, mediaType) => {
        await currentClient.subscribe(user, mediaType);
        console.log(" ### CHANNEL1, SUBSCRIBED TO REMOTE's " + mediaType);
      
        if(mediaType === "video")
        {
          const playerDomDiv = document.createElement("div");
          playerDomDiv.id = user.uid.toString();
          playerDomDiv.style.width = "160px";
          playerDomDiv.style.height = "120px";
          document.body.append(playerDomDiv);
      
          user.videoTrack.play(playerDomDiv.id);
        }
      
        if(mediaType === "audio")
        {
          user.audioTrack.play();
        }
      });
    
      // and remote unpublish event.
      this.clients[i].on("user-unpublished", 
                         async (user,mediaType) => {
        if(mediaType === "video")
        {
          console.log("### UNSUBSCRIBED USER " + user.uid.toString() + 
                      " FROM VIDEO ###");
          const playerDomDiv = document.getElementById(user.uid);
          playerDomDiv.remove();
        }

        if(mediaType === "audio")
        {
          console.log("### UNSUBSCRIBED USER " + user.uid.toString() +
                      "FROM AUDIO ###");
        }
      });   
    }

    this.numClients = i;
  }

  async joinChannels() 
  {
    let tempUid = 0;
    let tempChannelName = "";
    let i = 0;
    // Join one channel for each client object.
    for(i; i < this.numClients; i++)
    {
      tempChannelName = this.baseChannelName + i.toString();
      console.log("### TRYING TO JOIN: " + tempChannelName + " ###");
      tempUid = await this.clients[i].join(this.appId, 
                                           tempChannelName, 
                                           this.token, null);
      console.log("### JOINED: " + tempChannelName + " ###");
    }
    this.numChannels = i;
  }

  //
  async publishVideoToChannel(cameraId, publishToIndex) 
  {
    // If we're currently capturing, unpublish and stop the track.
    if(this.localVideoTrack != null)
    {
      console.log("### UNPUBLISHED VIDEO! ###");
      await this.clients[publishToIndex].unpublish(this.localVideoTrack);
      this.localVideoTrack.stop();
    }

    // Create a new track and publish.
    this.localVideoTrack = await AgoraRTC.createCameraVideoTrack( { 
      cameraId: cameraId, 
      encoderConfig: "120p",
    } );
    await this.clients[publishToIndex].publish(this.localVideoTrack);
    console.log("### PUBLISHED VIDEO! ###");
  }

  //
  async publishAudioToChannel(microphoneId, publishToIndex)
  {
    // If we're currently capturing, unpublish and stop the track.
    if(this.localAudioTrack != null)
    {
      console.log("### UNPUBLISHED AUDIO! ###");
      await this.clients[publishToIndex].unpublish(this.localAudioTrack);
      this.localAudioTrack.stop();
    }

    // Create a new track and publish.
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack( { 
      microphoneId: microphoneId, 
    } );
    await this.clients[publishToIndex].publish(this.localAudioTrack);
    console.log("### PUBLISHED AUDIO! ###");
  }

}

function initializeAngularController()
{
    /* Initialize the AngularJS controller for the Camera select box. */
    angularApp.controller('multiChannelCtrl', function($scope) {
    // Define the target client/channel we want to publish into.
    /* TO-DO: This needs to be based on some logic. */
    let targetClientIndex = 0;

    // Define the event handler for when the user selects a camera.
    $scope.changeSelectedCamera = function() 
    {
      console.log("### SELECTED NEW CAMERA: " + 
                  $scope.cameraSelect.name + " ###");
      agoraApp.publishVideoToChannel($scope.cameraSelect.value, 
                                     targetClientIndex);
    }

    // Define the event handler for when the user selects a microphone.
    $scope.changeSelectedMicrophone = function() 
    {
      console.log("### SELECTED NEW MICROPHONE: " + 
                  $scope.microphoneSelect.name + " ###");
      agoraApp.publishAudioToChannel($scope.microphoneSelect.value,
                                     targetClientIndex);
    }

      let tempNames = {};
      tempNames.cameras = [];
      tempNames.microphones = [];
   
      // Get the camera metadata. 
      AgoraRTC.getCameras().then(devices => {
        console.log("### GOT CAMERAS ###")
        devices.forEach(function (item, index) {
          console.log(devices[index].label + " device id: " +
                      devices[index].deviceId);
          // Push the metadata into our array structured for Angular.
          tempNames.cameras.push({ name: devices[index].label, 
                                   value: devices[index].deviceId });
        });
    
        // Update Angular's model for the select and force a view update.
        $scope.cameraNames = tempNames.cameras;
        $scope.$apply();
      });

      // Get the microphone metadata.      
      AgoraRTC.getMicrophones().then(devices => {
        console.log("### GOT MICROPHONES ###")
        devices.forEach(function (item, index) {
          console.log(devices[index].label + " device id: " + 
                      devices[index].deviceId);
          // Push the metadata into our array structured for Angular.
          tempNames.microphones.push({ name: devices[index].label, 
                                       value: devices[index].deviceId } );
        });
    
        // Update Angular's model for the select and force a view update.
        $scope.microphoneNames = tempNames.microphones;
        $scope.$apply();
      });
    });
}

let agoraApp = new AgoraMultiChanelApp();
let angularApp = angular.module('multiChannelApp', []);
initializeAngularController();