import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/data/menuItems.json');

const items = JSON.parse(readFileSync(filePath, 'utf-8'));

const updated = items.map((item) => {
  let img = item.image;

  if (item.category === 'combos') {
    if (item.id === 'combo-4') {
      img = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80';
    } else if (item.id === 'combo-5' || item.id === 'combo-6') {
      img = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80';
    }
  } else if (item.category === 'tandoori') {
    if (item.id === 'tan-1') {
      img = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80';
    } else if (item.id === 'tan-2') {
      img = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80';
    } else if (item.id === 'tan-10') {
      img = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80';
    }
  } else if (item.category === 'starters') {
    if (item.id === 'str-2') {
      img = 'https://images.unsplash.com/photo-1610057099443-fde8c4d90ef8?w=600&q=80';
    } else if (item.id === 'str-3' || item.id === 'str-4' || item.id === 'str-5') {
      img = 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80';
    } else if (item.id === 'str-10' || item.id === 'str-11') {
      img = 'https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=600&q=80';
    } else if (item.id === 'str-12' || item.id === 'str-13') {
      img = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80';
    } else if (item.id === 'str-14') {
      img = 'https://images.unsplash.com/photo-1559742811-822863cc4af7?w=600&q=80';
    } else if (item.id === 'str-19' || item.id === 'str-20' || item.id === 'str-21') {
      img = 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80';
    }
  } else if (item.category === 'biryani') {
    if (item.id === 'bir-2') {
      img = 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80';
    } else if (item.id.includes('mutton')) {
      img = 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80';
    } else if (item.id.includes('veg') || item.id.includes('paneer') || item.id.includes('mushroom') || item.id.includes('vankaya')) {
      img = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80';
    } else if (item.id.includes('fish') || item.id.includes('prawns')) {
      img = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80';
    }
  } else if (item.category === 'south-indian') {
    if (item.id === 'sin-12') {
      img = 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80';
    } else if (item.id.includes('paneer') || item.id.includes('chaman')) {
      img = 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80';
    } else if (item.id.includes('dal')) {
      img = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80';
    }
  } else if (item.category === 'rice') {
    if (item.id.includes('ragi')) {
      img = 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80';
    }
  } else if (item.category === 'breads') {
    if (item.id.includes('naan')) {
      img = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80';
    }
  } else if (item.category === 'desserts') {
    if (item.id === 'des-1') {
      img = 'https://images.unsplash.com/photo-1601303589883-722a466a9d59?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80';
    }
  } else if (item.category === 'beverages') {
    if (item.id === 'bev-1') {
      img = 'https://images.unsplash.com/photo-1608885898957-a559228e8749?w=600&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80';
    }
  }

  return { ...item, image: img };
});

writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
console.log('Successfully updated menu items with high-quality distinct images!');
