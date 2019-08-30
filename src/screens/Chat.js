import React, { Component } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { GiftedChat, Send, MessageImage } from 'react-native-gifted-chat';
import { ChatManager, TokenProvider } from '@pusher/chatkit-client';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/FontAwesome';
import DocumentPicker from 'react-native-document-picker';
import * as mime from 'react-native-mime-types';
import axios from 'axios';

import RNFetchBlob from 'rn-fetch-blob';
const Blob = RNFetchBlob.polyfill.Blob;
const fs = RNFetchBlob.fs;
window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest;
window.Blob = Blob;

import RNFS from 'react-native-fs';

const CHATKIT_INSTANCE_LOCATOR_ID = Config.CHATKIT_INSTANCE_LOCATOR_ID;
const CHATKIT_SECRET_KEY = Config.CHATKIT_SECRET_KEY;
const CHATKIT_TOKEN_PROVIDER_ENDPOINT = Config.CHATKIT_TOKEN_PROVIDER_ENDPOINT;

const GOOGLE_CLOUD_VISION_API_KEY = Config.GOOGLE_CLOUD_VISION_API_KEY;

class Chat extends Component {

  state = {
    messages: [],
    show_load_earlier: false,
    is_picking_file: false
  };


  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      headerTitle: params.room_name
    };
  };
  //

  constructor(props) {
    super(props);
    const { navigation } = this.props;

    this.user_id = navigation.getParam("user_id").toString();
    this.room_id = navigation.getParam("room_id");
  }


  componentWillUnMount() {
    this.currentUser.disconnect();
  }


  async componentDidMount() {
    try {
      const chatManager = new ChatManager({
        instanceLocator: CHATKIT_INSTANCE_LOCATOR_ID,
        userId: this.user_id,
        tokenProvider: new TokenProvider({ url: CHATKIT_TOKEN_PROVIDER_ENDPOINT })
      });

      let currentUser = await chatManager.connect();
      this.currentUser = currentUser;

      await this.currentUser.subscribeToRoomMultipart({
        roomId: this.room_id,
        hooks: {
          onMessage: this.onMessage
        },
        messageLimit: 10
      });

    } catch (chat_mgr_err) {
      console.log("error with chat manager: ", chat_mgr_err);
    }
  }


  onMessage = async (data) => {
    const { message } = await this.getMessage(data);

    this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, message)
    }));

    if (this.state.messages.length > 1) {
      this.setState({
        show_load_earlier: true
      });
    }
  }


  getMessage = async ({ id, sender, parts, createdAt }) => {
    const text_parts = parts.filter(part => part.partType === 'inline');
    const attachment = parts.find(part => part.partType === 'attachment');

    const attachment_url = (attachment) ? await attachment.payload.url() : null;
    const attachment_type = (attachment) ? attachment.payload.type : null;

    let msg_data = {
      _id: id,
      text: text_parts[0].payload.content,
      createdAt: new Date(createdAt),
      user: {
        _id: sender.id.toString(),
        name: sender.name,
        avatar: `https://ui-avatars.com/api/?background=d88413&color=FFF&name=${sender.name}`
      }
    };

    if (attachment && attachment_type.indexOf('image') !== -1) {
      const blur_image = (attachment.payload.customData) ? attachment.payload.customData.is_censored : false;
      Object.assign(msg_data, {
        image: attachment_url,
        blur_image
      });
    }

    return {
      message: msg_data
    };
  }


  render() {
    const { messages, show_load_earlier, is_loading } = this.state;
    return (
      <View style={styles.container}>
        {
          is_loading &&
          <ActivityIndicator size="small" color="#0000ff" />
        }
        <GiftedChat
          messages={messages}
          onSend={messages => this.onSend(messages)}
          showUserAvatar={true}
          user={{
            _id: this.user_id
          }}
          loadEarlier={show_load_earlier}
          onLoadEarlier={this.loadEarlierMessages}

          renderActions={this.renderCustomActions}
          renderSend={this.renderSend}
          renderMessageImage={this.renderMessageImage}
        />
      </View>
    );
  }
  //

  renderMessageImage = props => {
    const blur = (props.currentMessage.blur_image) ? 5 : 0;
    return <MessageImage {...props} imageProps={{blurRadius: blur}} />
  }
  //

  renderCustomActions = () => {
    if (!this.state.is_picking_file) {
      const icon_color = this.attachment ? "#0064e1" : "#808080";

      return (
        <View style={styles.customActionsContainer}>
          <TouchableOpacity onPress={this.openFilePicker}>
            <View style={styles.buttonContainer}>
              <Icon name="paperclip" size={23} color={icon_color} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    //

    return (
      <ActivityIndicator size="small" color="#0064e1" style={styles.loader} />
    );
  }
  //

  renderSend = props => {
    if (this.state.is_sending) {
      return (
        <ActivityIndicator
          size="small"
          color="#0064e1"
          style={[styles.loader, styles.sendLoader]}
        />
      );
    }
    return <Send {...props} />;
  }
  //

  openFilePicker = async () => {
    await this.setState({
      is_picking_file: true
    });

    try {
      const file = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
      });

      const file_type = mime.contentType(file.name);
      const base64 = await RNFS.readFile(file.uri, "base64");
      const file_blob = await Blob.build(base64, { type: `${file_type};BASE64` });

      this.attachment = {
        file_blob: file_blob,
        file_base64: base64,
        file_name: file.name,
        file_type: file_type
      };

      Alert.alert("Success", "File attached!");

      this.setState({
        is_picking_file: false
      });

    } catch (err) {
      this.setState({
        is_picking_file: false
      });
    }
  }


  loadEarlierMessages = async () => {
    this.setState({
      is_loading: true
    });

    const earliest_message_id = Math.min(
      ...this.state.messages.map(m => parseInt(m._id))
    );

    try {
      let messages = await this.currentUser.fetchMultipartMessages({
        roomId: this.room_id,
        initialId: earliest_message_id,
        direction: "older",
        limit: 10
      });

      if (!messages.length) {
        this.setState({
          show_load_earlier: false
        });
      }

      let earlier_messages = [];
      await this.asyncForEach(messages, async (msg) => {
        let { message } = await this.getMessage(msg);
        earlier_messages.push(message);
      });

      await this.setState(previousState => ({
        messages: previousState.messages.concat(earlier_messages.reverse())
      }));
    } catch (err) {
      console.log("error occured while trying to load older messages", err);
    }

    await this.setState({
      is_loading: false
    });
  }
  //

  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }


  onSend = async ([message]) => {
    this.setState({
      is_sending: true
    });

    let is_censored = false;

    if (this.attachment) {
      let body = {
        requests: [
          {
            features: [
              { type: "SAFE_SEARCH_DETECTION" }
            ],
            image: {
              content: this.attachment.file_base64
            }
          }
        ]
      };

      try {
        const cloud_vision_res = await axios({
          method: 'post',
          url: `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          data: JSON.stringify(body)
        });

        const has_match = Object.entries(cloud_vision_res.data.responses[0].safeSearchAnnotation).filter(item => {
          return item[1] == 'VERY_LIKELY' || item[1] == 'LIKELY';
        });

        if (has_match.length) {
          is_censored = true;
        }

      } catch (err) {
        console.log('error with google API: ', err);
      }
    }

    try {
      const message_parts = [
        { type: "text/plain", content: message.text }
      ];

      if (this.attachment) {
        const { file_blob, file_name, file_type } = this.attachment;
        message_parts.push({
          file: file_blob,
          name: file_name,
          type: file_type,
          customData: { is_censored }
        });
      }

      await this.currentUser.sendMultipartMessage({
        roomId: this.room_id,
        parts: message_parts
      });

      this.attachment = null;

      this.setState({
        is_sending: false
      });

    } catch (send_msg_err) {
      this.setState({
        is_sending: false
      });
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loader: {
    paddingTop: 20
  },
  sendLoader: {
    marginRight: 10,
    marginBottom: 10
  },
  customActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  buttonContainer: {
    padding: 10
  }
});

export default Chat;