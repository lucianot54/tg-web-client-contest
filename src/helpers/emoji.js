export let emojiConverter;

export const createEmojiConverter = isOnlyFlags => {
  emojiConverter = new EmojiConvertor();
  emojiConverter.use_css_imgs = true;
  emojiConverter.use_sheet = true;
  emojiConverter.img_sets.apple.sheet = isOnlyFlags
    ? 'img/emoji-flags.png'
    : 'img/emoji.png';
};