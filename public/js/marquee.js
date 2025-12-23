const claimIds = [
  '667b64a74f1183d4c8efdddb8ac4c2933ebfe411',
  'b557b5fe9735936b2c3cd869544f4cbe546cacfe',
  '237f0dcbcbdb9de1d5eace1436fafaa7043b2e93',
  '56e86eb938c0b93beccde0fbaaead65755139a10',
  '2332c0df0bd5e046db04fe7e3e79f756d35a1523',
  '8d497e7e96c789364c56aea7a35827d2dc1eea65',
  '13a8529aa1e71268a5d094150ca0086caacb59d5',
  '695bf734b23fccc50c4a21d9f450c62035b93a16',
  'e79715c70d85dd766be18640448145570486f6dd',
  '3cdcc0fe5e011d7765faf3c32df91cd1b092953f',
  '5d9ea5ea1e333256ba3f18fce533b8cb26abc06a',
  '2d154421c5fbdd15d4032fb5063eac72f4d35b74',
  'c34ee3659aefcfcc406b23609cf6f57be94af689',
  'f72567faf314d8caa16976acaf104e2f1df809a9',
  '057ca5a46e70cc1cb70558940ba0a7f22bad5714',
  'e29e2ced2f8b829f4a056b593ca673575ffada33',
  '25240318d69d321a61ae9a262dc92de73fdf4fbd',
  'ada5f36d4a63794403f47589de4f3b80fb60cf8d',
  'ad60db64cbdf965aff55236c327536aa3b23bc05',
  'd1f769b5464e3a8412e6f2505c2650f1caacad41',
  '276900026e6891a2a8f47a6924803b5b1b19ea04',
  'e9300d5046ba6ecd336dced3bd979e0911786bb5',
  'ab1f3566be79649ab5276370c3daa3f3c8d6a339',
  'afc3964146127ff17714b11577867b20ca4c875e',
  '882f24e777caf9d950dc50ae6713fdcb64c9b2ca',
  '475bf8bafc268d0963177241d8c0a7bc911e1aa3',
  'cf6710754110dd43722cb8217fe1a3a93c93599b',
  '91707e568daa5838cb744d9c171bf9e12d502678',
  '9515ac5e631a118fb4abee5bfa5eba5842d7ea0c',
  'de2d8f6bec64cf05a53acce6cc8642edb3c93989',
  '7adc6abc93a53a95be2d447c2a3e86eb383f8f31',
];

const AVATAR_COLOR_CLASSES = [
  'avatar-bg-0',
  'avatar-bg-1',
  'avatar-bg-2',
  'avatar-bg-3',
  'avatar-bg-4',
  'avatar-bg-5',
  'avatar-bg-6',
  'avatar-bg-7',
  'avatar-bg-8',
  'avatar-bg-9',
  'avatar-bg-10',
  'avatar-bg-11',
];

function getConsistentColorClass(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLOR_CLASSES.length;
  return AVATAR_COLOR_CLASSES[index];
}

function renderFallbackAvatar(letter, colorClass) {
  const safeLetter = letter || '?';
  const safeClass =
    colorClass && AVATAR_COLOR_CLASSES.includes(colorClass) ? colorClass : AVATAR_COLOR_CLASSES[0];
  return `<div class="avatar-fallback w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm avatar-color ${safeClass}">${safeLetter}</div>`;
}

function replaceWithFallback(avatarImg) {
  if (!avatarImg) return;

  const parent = avatarImg.parentElement;
  if (!parent) return;

  const colorClass = avatarImg.getAttribute('data-color-class');
  const firstLetter = avatarImg.getAttribute('data-first-letter');

  parent.innerHTML = renderFallbackAvatar(firstLetter, colorClass);
}

function cleanDescription(html) {
  if (!html) return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => img.remove());

  const text = tempDiv.textContent || tempDiv.innerText || '';
  return text.replace(/\s+/g, ' ').trim();
}

function isAllowedImageUrl(url) {
  if (!url) return false;

  const allowedDomains = [
    'thumbs.odycdn.com',
    'thumbnails.odycdn.com',
    'odysee.com',
    'static.odycdn.com',
    'twemoji.maxcdn.com',
    'spee.ch',
    'arweave.net',
    'uexkkutudmzozimeopch.supabase.co',
  ];

  try {
    const urlObj = new URL(url);

    return (
      allowedDomains.some(
        (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      ) ||
      urlObj.protocol === 'data:' ||
      urlObj.protocol === 'blob:' ||
      url.startsWith('/')
    );
  } catch {
    return false;
  }
}

function updateMarqueeAnimationMetrics(marqueeContent) {
  if (!marqueeContent) return;
  const container = marqueeContent.parentElement;
  if (!container) return;

  const containerWidth = container.getBoundingClientRect().width;
  const contentWidth = marqueeContent.scrollWidth;
  if (!containerWidth || !contentWidth) return;

  const startOffset = containerWidth;
  const endOffset = -contentWidth;
  marqueeContent.style.setProperty('--marquee-start', `${startOffset}px`);
  marqueeContent.style.setProperty('--marquee-end', `${endOffset}px`);

  const pixelsPerSecond = 100;
  const totalDistance = startOffset + contentWidth;
  const durationSeconds = Math.max(totalDistance / pixelsPerSecond, 20);
  marqueeContent.style.setProperty('--marquee-duration', `${durationSeconds}s`);

  marqueeContent.style.animation = 'none';

  void marqueeContent.offsetWidth;
  marqueeContent.style.removeProperty('animation');
}

function attachMarqueeResizeHandler(marqueeContent) {
  if (!marqueeContent) return;
  let resizeTimeoutId = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeoutId);
    resizeTimeoutId = window.setTimeout(() => {
      updateMarqueeAnimationMetrics(marqueeContent);
    }, 150);
  });
}

async function fetchChannelData(claimId) {
  try {
    const response = await fetch('https://api.na-backend.odysee.com/api/v1/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'claim_search',
        params: { claim_ids: [claimId], page_size: 1, no_totals: true },
      }),
    });
    const data = await response.json();
    const items = data?.result?.items || data?.data?.result?.items || [];
    const item = Array.isArray(items) && items[0] ? items[0] : null;
    if (item) {
      const channel = item.signing_channel || item.publisher || item.value?.signing_channel || item;
      const title = channel.title || channel.name || 'Unknown Channel';
      const rawDescription = channel.description || channel.value?.description || '';

      const description = cleanDescription(rawDescription);

      const rawThumbnail = channel.thumbnail?.url || channel.value?.thumbnail?.url || '';

      const thumbnail = isAllowedImageUrl(rawThumbnail) ? rawThumbnail : '';

      const name = channel.name || item.name || '';
      const url = name ? `https://odysee.com/${name}` : '';
      return {
        title,
        description,
        thumbnail,
        url,
      };
    }
  } catch (error) {
    console.error('Error fetching channel data:', error);
  }
  return null;
}

async function loadMarquee() {
  const marqueeContent = document.getElementById('marquee-content');
  if (!marqueeContent) return;

  const channels = [];
  for (const claimId of claimIds) {
    const data = await fetchChannelData(claimId);
    if (data) {
      channels.push(data);
    }
  }

  if (channels.length === 0) return;

  const createItem = (channel) => {
    const item = document.createElement('a');
    item.href = channel.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
    item.className =
      'flex flex-col gap-1 rounded-md border bg-card p-4 text-card-foreground shadow-sm hover:bg-card/80 transition-colors';

    let avatarContent;
    if (channel.thumbnail) {
      const cleanTitle = channel.title.replace(/^@/, '');
      const firstLetter = cleanTitle.charAt(0).toUpperCase();
      const colorClass = getConsistentColorClass(cleanTitle);
      avatarContent = `<img src="${channel.thumbnail}" alt="" class="w-8 h-8 rounded-full object-cover avatar-image" data-channel-title="${channel.title}" data-color-class="${colorClass}" data-first-letter="${firstLetter}">`;
    } else {
      const cleanTitle = channel.title.replace(/^@/, '');
      const firstLetter = cleanTitle.charAt(0).toUpperCase();
      const colorClass = getConsistentColorClass(cleanTitle);
      avatarContent = `<div class="avatar-fallback w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm avatar-color ${colorClass}" data-color-class="${colorClass}">${firstLetter}</div>`;
    }

    item.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <div class="avatar-container">
                    ${avatarContent}
                </div>
                <div class="font-bold text-sm leading-tight sm:text-base">${channel.title}</div>
            </div>
            <span class="line-clamp-2 text-muted-foreground text-sm">${channel.description}</span>
        `;

    setTimeout(() => {
      const avatarImg = item.querySelector('.avatar-image');
      if (avatarImg) {
        const loadTimeout = setTimeout(() => {
          replaceWithFallback(avatarImg);
        }, 5000);

        avatarImg.onload = function () {
          clearTimeout(loadTimeout);
          avatarImg.onload = null;
          avatarImg.onerror = null;
        };

        avatarImg.onerror = function () {
          clearTimeout(loadTimeout);
          replaceWithFallback(this);
          avatarImg.onload = null;
          avatarImg.onerror = null;
        };
      }

      const avatarColor = item.querySelector('.avatar-color');
      if (avatarColor) {
        const colorClass = avatarColor.getAttribute('data-color-class');
        if (colorClass) {
          avatarColor.classList.add(colorClass);
        }
      }
    }, 0);

    return item;
  };

  channels.forEach((channel) => {
    marqueeContent.appendChild(createItem(channel));
  });

  updateMarqueeAnimationMetrics(marqueeContent);
  attachMarqueeResizeHandler(marqueeContent);
}

document.addEventListener('DOMContentLoaded', loadMarquee);
