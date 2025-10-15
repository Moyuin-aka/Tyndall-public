/**
 * 友情链接数据
 * 用于展示在 /friends 页面
 */

export interface Friend {
  name: string;
  url: string;
  avatar?: string;
  description: string;
  tags?: string[];
}

export const friends: Friend[] = [
  {
    name: "Moyuin",
    url: "https://moyuin.top",
    avatar: "https:/moyuin.top/avatar.webp",
    description: "缥缈，游荡，没有来路与归处。",
    tags: ["Friends"]
  },
  // Add more friends here
];

// 申请友链的说明
export const friendshipGuidelines = {
  zh: {
    myInfo: {
      name: 'Your Name',
      avatar: 'https://yourdomain.com/avatar.webp',
      url: 'https://yourdomain.com',
      description: 'Your desc.'
    },
    howToApply: '如果你也想和我交换友链，可以通过 <a href="mailto:your@email.com">邮件</a> 或者其他方式联系我～期待与你的相遇！'
  },
  en: {
    myInfo: {
      name: 'Your Name',
      avatar: 'https://yourdomain.com/avatar.webp',
      url: 'https://yourdomain.com',
      description: 'Your desc.'
    },
    howToApply: 'If you\'d like to exchange links with me, feel free to reach out via <a href="mailto:your@email.com">email</a> or any other means. Looking forward to connecting with you!'
  }
};
