import { createApp, h, ref } from 'vue';
import HyperchatMarquee from './HyperchatMarquee.vue';

export function mountHyperchatMarquee(language = 'en') {
  const mountId = 'hyperchat-marquee-root';
  let host = document.getElementById(mountId);
  
  if (!host) {
    host = document.createElement('div');
    host.id = mountId;

    document.body.insertBefore(host, document.body.firstChild);
  }

  const hyperchatsRef = ref([]);
  const languageRef = ref(language);

  const app = createApp({
    name: 'HyperchatMarqueeMount',
    setup() {
        return () => h(HyperchatMarquee, {
            chats: hyperchatsRef.value,
            visible: true,
            language: languageRef.value,
            context: 'chat'
        });
    }
  });

  app.mount(host);
  
  return {
      app,
      setLanguage: (lang) => {
          languageRef.value = lang;
      },
      addHyperchat: (chat) => {
          const exists = hyperchatsRef.value.find(c => {
            if (c.id === chat.id) return true;
            if (chat.comment_id && c.comment_id === chat.comment_id) return true;
            return false;
          });
          
          if (!exists) {
              hyperchatsRef.value.push(chat);
          }
      },
      unmount: () => {
          app.unmount();
          if (host && host.parentNode) {
              host.parentNode.removeChild(host);
          }
      }
  };
}
