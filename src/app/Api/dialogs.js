/* global tgProto */

const getDialogs = async () => {
  let loadedCount = 0;
  let allCount = 1;

  let dialogs = [];
  let messages = [];
  let users = [];
  let chats = [];

  let offsetDate = 0;

  while(loadedCount < allCount) {
    const messagesDialogs = await tgProto.sendMethod('messages.getDialogs', {
      offset_date: offsetDate,
      offset_id: 0,
      offset_peer: {
        _: 'inputPeerEmpty'
      },
      limit: 100,
      hash: 0
    });

    loadedCount += messagesDialogs.dialogs.length;
    allCount = messagesDialogs.count || 0;

    dialogs = dialogs.concat(messagesDialogs.dialogs);
    messages = messages.concat(messagesDialogs.messages);
    users = users.concat(messagesDialogs.users);
    chats = chats.concat(messagesDialogs.chats);

    offsetDate = messages[messages.length - 1].date;
  }

  return {
    dialogs,
    messages,
    users,
    chats
  };
};

export {
  getDialogs
};