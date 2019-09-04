# RNChatkitCensorImages
A React Native chat app which blurs NSFW images.

You can read the full tutorial at: [https://pusher.com/tutorials/react-native-chat-censor-images](https://pusher.com/tutorials/react-native-chat-censor-images)

The app has the following features:

- Logging in as a specific user
- Listing rooms
- Joining a room
- Entering a room
- Sending and receiving messages
- Loading old messages
- Attaching image files
- Blurring NSFW images

Each branch contains the code on each part of the tutorial:

- `starter` - the starting point when following the tutorial. This contains the code for the pre-built chat app (without the image censoring features).
- `censor-images` - contains the code for blurring NSFW images. 
- `master` - contains the latest code with the native app configuration files.

### Prerequisites

-   React Native development environment
-   [Node.js](https://nodejs.org/en/)
-   [Yarn](https://yarnpkg.com/en/)
-   [Chatkit app instance](https://pusher.com/chatkit)
-   [Google Cloud console account](https://console.cloud.google.com) with Cloud Vision API enabled
-   [ngrok account](https://ngrok.com/)

## Getting Started

1.  Clone the repo:

```
git clone https://github.com/anchetaWern/RNChatkitCensorImages.git
cd RNChatkitCensorImages
git checkout censor-images
```

2.  Install the app dependencies:

```
yarn
```

3.  Eject the project (re-creates the `ios` and `android` folders):

```
react-native eject
```

4.  Link the packages manually (if they don't support auto-linking yet):

- [React Native Config](https://github.com/luggit/react-native-config)
- [React Native Document Picker](https://github.com/Elyx0/react-native-document-picker)
- [react-native-fs](https://github.com/itinance/react-native-fs)
- [React Navigation](https://reactnavigation.org/)
- [React Native Gesture Handler](https://github.com/kmagiera/react-native-gesture-handler)
- [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons)
- [rn-fetch-blob](https://github.com/joltup/rn-fetch-blob)

5.  Update the `.env` and `server/.env` file with your Chatkit and Google Cloud Console credentials.

6.  Set up the server:

```
cd server
yarn
```

7.  Run the server:

```
yarn start
```

8. Run ngrok:

```
./ngrok http 5000
```

9. Update the `src/screens/Rooms.js` file with your ngrok https URL.

10. Run the app:

```
react-native run-android
react-native run-ios
```

## Built With

-   [React Native](http://facebook.github.io/react-native/)
-   [Chatkit](https://pusher.com/chatkit)
-   [Google Cloud Vision API](https://cloud.google.com/vision/docs/)
