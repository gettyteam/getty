const path = require('path');
const { loadTenantConfig } = require('../lib/tenant-config');
const CONFIG_DIR = path.join(process.cwd(), 'config');

const STREAM_DB_ENABLED = process.env.GETTY_STREAM_HISTORY_DB === '1';
let streamHistoryDb = null;
if (STREAM_DB_ENABLED) {
  try {
    streamHistoryDb = require('../lib/db/stream-history');
  } catch (err) {
    console.error('[admin-dashboard] failed to load stream history db', err);
  }
}

function registerAdminDashboardRoutes(app, context) {
  const store = context?.store;

  app.get('/api/admin/modules/unconfigured', async (req, res) => {
    const modules = [
      {
        id: 'integrations',
        name: 'Integrations',
        description: 'Integrate Discord or Telegram in your experience. Handle webhooks to send notifications when your channel is live, you upload new content or receive tips.',
        configurationPath: '/admin/integrations',
        icon: 'pi pi-share-alt',
        priority: 1,
        configFile: 'external-notifications-config.json'
      },
      {
        id: 'chat',
        name: 'Chat',
        description: 'Configure chat settings and overlays',
        configurationPath: '/admin/chat',
        icon: 'pi pi-comments',
        priority: 2,
        configFile: 'chat-config.json'
      },
      {
        id: 'achievements',
        name: 'Achievements',
        description: 'Set up achievements for your community',
        configurationPath: '/admin/achievements',
        icon: 'pi pi-star',
        priority: 3,
        configFile: 'achievements-config.json'
      },
      {
        id: 'raffle',
        name: 'Raffle',
        description: 'Host giveaways for your viewers',
        configurationPath: '/admin/raffle',
        icon: 'pi pi-gift',
        priority: 4,
        configFile: 'raffle-config.json'
      },
      {
        id: 'tip-goal',
        name: 'Tip Goal',
        description: 'Set a tipping goal to inspire your audience to support your content with their donations. Set your tipping goals now!',
        configurationPath: '/admin/tip-goal',
        icon: 'pi pi-bullseye',
        priority: 5,
        configFile: 'tip-goal-config.json'
      },
      {
        id: 'social-media',
        name: 'Social Media',
        description: 'Share your social media profiles as a widget to connect more, increase followers and sync posts directly from Odysee.',
        configurationPath: '/admin/social-media',
        icon: 'pi pi-share-alt',
        priority: 6,
        configFile: 'socialmedia-config.json'
      },
      {
        id: 'notifications',
        name: 'Notifications',
        description: 'Customize alerts for donations',
        configurationPath: '/admin/notifications',
        icon: 'pi pi-bell',
        priority: 7,
        configFile: 'tip-notification-config.json'
      },
      {
        id: 'announcement',
        name: 'Announcements',
        description: 'Create custom banners to display key information in your stream, such as announcements or promotions.',
        configurationPath: '/admin/announcement',
        icon: 'pi pi-megaphone',
        priority: 8,
        configFile: 'live-announcement-config.json'
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Configure event overlays and settings',
        configurationPath: '/admin/events',
        icon: 'pi pi-list',
        priority: 9,
        configFile: 'events-settings.json'
      },
      {
        id: 'last-tip',
        name: 'Last Tip',
        description: 'Display the last tip received on your stream',
        configurationPath: '/admin/last-tip',
        icon: 'pi pi-dollar',
        priority: 10,
        configFile: 'last-tip-config.json'
      },
      {
        id: 'liveviews',
        name: 'Live Views',
        description: 'Show current viewer count and stream status',
        configurationPath: '/admin/liveviews',
        icon: 'pi pi-eye',
        priority: 11,
        configFile: 'liveviews-config.json'
      },
      {
        id: 'user-profile',
        name: 'User Profile',
        description: 'Customize your public profile page',
        configurationPath: '/admin/user-profile',
        icon: 'pi pi-user',
        priority: 12,
        configFile: 'user-profile-config.json'
      }
    ];

    const checks = await Promise.all(
      modules.map(async (m) => {
        try {
          const globalPath = path.join(CONFIG_DIR, m.configFile);
          const result = await loadTenantConfig(req, store, globalPath, m.configFile);
          const configData = result?.data;
          
          let hasConfig = configData && Object.keys(configData).length > 0;

          if (hasConfig) {
             if (m.id === 'announcement' && configData.auto === false && !configData.title) {
                 hasConfig = false;
             }
             if (m.id === 'notifications' && (!configData.discordWebhook && !configData.telegramBotToken)) {
                 hasConfig = false;
             }
             if (m.id === 'chat' && !configData.channelId) {
                 hasConfig = false;
             }
             if (m.id === 'achievements' && (!configData.achievements || configData.achievements.length === 0)) {
                 hasConfig = false;
             }
             if (m.id === 'raffle' && (!configData.keyword)) {
                 hasConfig = false;
             }
             if (m.id === 'events' && (!configData.enabledActivities || configData.enabledActivities.length === 0)) {
                 hasConfig = false;
             }
             if (m.id === 'liveviews' && !configData.claimid) {
                 hasConfig = false;
             }
             if (m.id === 'user-profile' && configData.shareEnabled !== true) {
                 hasConfig = false;
             }
          }

          return { module: m, configured: hasConfig };
        } catch (err) {
          console.error(`Error checking config for ${m.id}:`, err);
          return { module: m, configured: false };
        }
      })
    );

    const unconfigured = checks.filter((c) => !c.configured).map((c) => c.module);
    res.json({ modules: unconfigured });
  });

  app.get('/api/admin/stream/metrics', async (req, res) => {
    let metrics = {
      chatters: 0,
      viewers: 0,
      duration: 0,
      lastStreamDate: null
    };

    if (streamHistoryDb) {
      try {
        const lastStream = await streamHistoryDb.getLastStream(req, store);
        if (lastStream) {
          metrics = {
            chatters: lastStream.unique_chatters || 0,
            viewers: lastStream.max_viewers || 0,
            duration: lastStream.duration_minutes ? `${lastStream.duration_minutes}m` : '0m',
            lastStreamDate: lastStream.started_at
          };
        }
      } catch (err) {
        console.error('[admin-dashboard] error fetching last stream metrics', err);
      }
    } else if (req.app.locals.streamHistoryHelpers) {
      try {
        const helpers = req.app.locals.streamHistoryHelpers;
        const hist = await helpers.loadHistory(req);
        const perf = helpers.computePerformance(hist, 'year', 10);
        const last = perf.recentStreams && perf.recentStreams.length > 0 ? perf.recentStreams[0] : null;
        
        let uniqueChatters = 0;
        const chatNs = req.app.locals.chatNs;
        const ns = req.ns?.admin || req.walletSession?.walletHash || req.query?.token;

        if (chatNs && ns) {
          try {
            const session = chatNs.sessions.get(ns);
            if (session) {
              if (session.uniqueChatters) {
                uniqueChatters = session.uniqueChatters.size;
              } else if (Array.isArray(session.history)) {
                const unique = new Set(
                  session.history.map((m) => m.userId || m.username).filter(Boolean)
                );
                uniqueChatters = unique.size;
              }
            }
          } catch {}
        }

        if (uniqueChatters === 0 && store && store.redis && ns) {
          try {
            const cached = await store.redis.get(`getty:chatters:${ns}`);
            if (cached) uniqueChatters = Number(cached);
          } catch {}
        }

        if (last) {
          const durationMinutes = Math.round((last.durationHours || 0) * 60);
          metrics = {
            chatters: uniqueChatters,
            viewers: last.peakViewers || 0,
            duration: `${durationMinutes}m`,
            lastStreamDate: new Date(last.startEpoch)
          };
        }
      } catch (err) {
        console.error('[admin-dashboard] error fetching last stream metrics from helpers', err);
      }
    }

    res.json({ metrics });
  });
}

module.exports = registerAdminDashboardRoutes;
