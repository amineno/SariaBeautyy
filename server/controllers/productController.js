const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const { broadcastEvent } = require('../utils/sse');

// Build readable name from filename
const buildNameFromFilename = (filename) => {
  const base = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (/^\d+$/.test(base)) return `Saria Beauty ${base}`;
  return base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Hardcoded realistic product metadata per image filename (EN/FR/AR)
// If a filename is not listed here, generic but realistic copy will be used.
const imageProductMeta = {
  '1.png': {
    name: 'Rose Glow Serum',
    category: 'Skincare',
    price: 49.00,
    description: 'Brightening face serum with vitamin C and rose extract for a luminous complexion.',
    translations: {
      fr: { name: 'Sérum Éclat Rose', description: 'Sérum visage éclaircissant à la vitamine C et extrait de rose pour un teint lumineux.' },
      ar: { name: 'سيروم إشراقة الورد', description: 'سيروم للوجه بفيتامين سي وخلاصة الورد يمنح إشراقًا واضحًا.' },
    },
  },
  '2.png': {
    name: 'Velvet Rose Lipstick',
    category: 'Beauty',
    price: 24.00,
    description: 'Matte lipstick with velvet finish and deep rose pigment that lasts all day.',
    translations: {
      fr: { name: 'Rouge à Lèvres Velours Rose', description: 'Rouge à lèvres mat, fini velours, pigment rose profond qui tient toute la journée.' },
      ar: { name: 'أحمر شفاه مخملي وردي', description: 'أحمر شفاه مطفي بلمسة مخملية، لون وردي عميق يدوم طوال اليوم.' },
    },
  },
  '3.png': {
    name: 'Luminous Silk Foundation',
    category: 'Beauty',
    price: 45.00,
    description: 'Weightless foundation delivering medium coverage and a soft, radiant finish.',
    translations: {
      fr: { name: 'Fond de Teint Soie Lumineuse', description: 'Fond de teint léger, couvrance moyenne, fini doux et lumineux.' },
      ar: { name: 'كريم أساس حريري مضيء', description: 'كريم أساس خفيف يمنح تغطية متوسطة وإنهاء ناعم ومضيء.' },
    },
  },
  '4.png': {
    name: 'Rose Quartz Roller',
    category: 'Tools',
    price: 29.00,
    description: 'Cooling facial roller crafted from rose quartz to depuff and enhance glow.',
    translations: {
      fr: { name: 'Roller Quartz Rose', description: 'Roller visage en quartz rose, effet rafraîchissant pour défatiguer et illuminer.' },
      ar: { name: 'رولر كوارتز وردي', description: 'أداة تدليك للوجه من حجر الكوارتز الوردي لتقليل الانتفاخ وتعزيز اللمعان.' },
    },
  },
  '5.png': {
    name: 'Silk Touch Primer',
    category: 'Beauty',
    price: 32.00,
    description: 'Blurring primer that smooths texture and prolongs wear.',
    translations: {
      fr: { name: 'Base Lissante Soie', description: 'Base floutante qui lisse le grain de peau et prolonge la tenue.' },
      ar: { name: 'برايمر لمسة حرير', description: 'برايمر لتنعيم الملمس ويطيل الثبات.' },
    },
  },
  '6.png': {
    name: 'Rose Petal Mist',
    category: 'Skincare',
    price: 22.00,
    description: 'Hydrating face mist with rose water to refresh and soothe skin.',
    translations: {
      fr: { name: 'Brume Pétales de Rose', description: 'Brume hydratante à l’eau de rose pour rafraîchir et apaiser la peau.' },
      ar: { name: 'رذاذ بتلات الورد', description: 'رذاذ مرطب للوجه بماء الورد ينعش ويهدئ البشرة.' },
    },
  },
  '7.png': {
    name: 'Golden Glow Highlighter',
    category: 'Beauty',
    price: 27.00,
    description: 'Finely milled powder highlighter with rose-gold tones for a soft sheen.',
    translations: {
      fr: { name: 'Enlumineur Éclat Doré', description: 'Enlumineur poudre aux tons or rose pour une lueur subtile.' },
      ar: { name: 'هايلايتر توهج ذهبي', description: 'هايلايتر بودرة ناعمة بظلال ذهبية وردية تمنح لمعانًا رقيقًا.' },
    },
  },
  '8.png': {
    name: 'Silk Finish Setting Spray',
    category: 'Beauty',
    price: 26.00,
    description: 'Long-wear setting spray that locks in your look with a luminous finish.',
    translations: {
      fr: { name: 'Spray Fixateur Fini Soie', description: 'Spray fixateur longue tenue au fini lumineux.' },
      ar: { name: 'رذاذ تثبيت لمسة حرير', description: 'رذاذ تثبيت طويل الأمد يمنح إنهاءً مضيئًا.' },
    },
  },
  '9.png': {
    name: 'Rose Silk Compact',
    category: 'Beauty',
    price: 34.00,
    description: 'Pressed powder compact for shine control and a soft-focus complexion.',
    translations: {
      fr: { name: 'Poudre Compacte Soie Rose', description: 'Poudre compacte pour contrôler la brillance et un teint flouté.' },
      ar: { name: 'بودرة مضغوطة حرير وردي', description: 'بودرة مضغوطة للتحكم باللمعان ومنح تأثير ناعم.' },
    },
  },
  '10.png': {
    name: 'Radiant Rose Blush',
    category: 'Beauty',
    price: 23.00,
    description: 'Silky powder blush in a flattering rose tone with buildable pigment.',
    translations: {
      fr: { name: 'Blush Rose Rayonnant', description: 'Blush poudre soyeux au ton rose flatteur, pigment modulable.' },
      ar: { name: 'بلاشر وردي مشرق', description: 'بلاشر بودرة حريري بدرجة وردية جذابة وقابل للبناء.' },
    },
  },
  '11.png': {
    name: 'Gold Rose Perfume Oil',
    category: 'Fragrance',
    price: 39.00,
    description: 'Concentrated perfume oil blending damask rose with warm amber and soft musk.',
    translations: {
      fr: { name: 'Huile de Parfum Or Rose', description: 'Huile de parfum concentrée alliant rose de Damas, ambre chaud et musc doux.' },
      ar: { name: 'زيت عطر الورد الذهبي', description: 'زيت عطر مركز يمزج الورد الدمشقي بالعنبر الدافئ والمسك الناعم.' },
    },
  },
  '12.png': {
    name: 'Rose Silk Hand Cream',
    category: 'Bodycare',
    price: 18.00,
    description: 'Nourishing hand cream with shea butter and rose essence for soft hands.',
    translations: {
      fr: { name: 'Crème Mains Soie Rose', description: 'Crème nourrissante au beurre de karité et essence de rose pour des mains douces.' },
      ar: { name: 'كريم يدين حرير وردي', description: 'كريم مغذي لليدين بزبدة الشيا وخلاصة الورد يمنح نعومة.' },
    },
  },
  '13.png': {
    name: 'Rose Gold Hair Oil',
    category: 'Haircare',
    price: 28.00,
    description: 'Lightweight hair oil to tame frizz and add shine without weighing down.',
    translations: {
      fr: { name: 'Huile Capillaire Or Rose', description: 'Huile légère pour discipliner les frisottis et apporter de la brillance sans alourdir.' },
      ar: { name: 'زيت شعر ذهب وردي', description: 'زيت شعر خفيف يقلل الهيشان ويمنح لمعانًا دون إثقال.' },
    },
  },
  '14.png': {
    name: 'Silk Rose Body Lotion',
    category: 'Bodycare',
    price: 21.00,
    description: 'Hydrating body lotion with aloe and rose to smooth and soften skin.',
    translations: {
      fr: { name: 'Lait Corps Soie Rose', description: 'Lotion hydratante à l’aloe et rose pour une peau douce et lisse.' },
      ar: { name: 'لوشن جسم حرير وردي', description: 'لوشن مرطب للجسم بالألوة والورد لنعومة البشرة.' },
    },
  },
  '15.png': {
    name: 'Velvet Eye Shadow Duo',
    category: 'Beauty',
    price: 29.00,
    description: 'Two-pan eyeshadow palette with rose and gold hues in velvet textures.',
    translations: {
      fr: { name: 'Duo Fard à Paupières Velours', description: 'Palette deux fards aux teintes rose et or avec textures velours.' },
      ar: { name: 'ثنائي ظلال مخملية', description: 'بالت ظلال عيون من درجتين وردي وذهبي بقوام مخملي.' },
    },
  },
  '16.png': {
    name: 'Silk Brow Gel',
    category: 'Beauty',
    price: 19.00,
    description: 'Clear hold brow gel to shape and set brows with a natural finish.',
    translations: {
      fr: { name: 'Gel Sourcils Soie', description: 'Gel transparent pour fixer et structurer les sourcils au fini naturel.' },
      ar: { name: 'جل حواجب حريري', description: 'جل شفاف لتثبيت وتشكيل الحواجب بإنهاء طبيعي.' },
    },
  },
  '17.png': {
    name: 'Rose Renewal Night Cream',
    category: 'Skincare',
    price: 54.00,
    description: 'Rich night cream with peptides and rosehip to restore overnight.',
    translations: {
      fr: { name: 'Crème Nuit Renouvellement Rose', description: 'Crème nuit riche aux peptides et cynorhodon pour une réparation nocturne.' },
      ar: { name: 'كريم ليلي تجديد الورد', description: 'كريم ليلي غني بالبيبتيدات وزيت بذور الورد للتجديد أثناء النوم.' },
    },
  },
  '18.png': {
    name: 'Gold Infused Sheet Mask',
    category: 'Skincare',
    price: 7.50,
    description: 'Hydrogel sheet mask infused with gold and botanical extracts for instant radiance.',
    translations: {
      fr: { name: 'Masque Tissu Infusé Or', description: 'Masque hydrogel infusé d’or et extraits botaniques pour un éclat immédiat.' },
      ar: { name: 'قناع ورقي مدمج بالذهب', description: 'قناع هيدروجيل بذهب ومستخلصات نباتية يمنح إشراقًا فوريًا.' },
    },
  },
  '19.png': {
    name: 'Rose Velvet Lip Balm',
    category: 'Beauty',
    price: 15.00,
    description: 'Cushiony lip balm with rose wax for comfort and soft shine.',
    translations: {
      fr: { name: 'Baume Lèvres Velours Rose', description: 'Baume lèvres moelleux à la cire de rose pour confort et éclat doux.' },
      ar: { name: 'بلسم شفاه مخملي وردي', description: 'بلسم شفاه ناعم بشمع الورد يمنح راحة ولمعانًا خفيفًا.' },
    },
  },
  '21.png': {
    name: 'Pure Rose Micellar Water',
    category: 'Skincare',
    price: 17.00,
    description: 'Gentle micellar water that cleanses skin while calming skin.',
    translations: {
      fr: { name: 'Eau Micellaire Rose Pure', description: 'Eau micellaire douce qui nettoie tout en apaisant la peau.' },
      ar: { name: 'ماء ميسيلار الورد النقي', description: 'ماء ميسيلار لطيف ينظف ويهدئ البشرة.' },
    },
  },
  '22.png': {
    name: 'Silk Contour Stick',
    category: 'Beauty',
    price: 25.00,
    description: 'Cream contour stick with blendable texture for natural definition.',
    translations: {
      fr: { name: 'Stick Contour Soie', description: 'Stick contour crème, texture fondante pour une définition naturelle.' },
      ar: { name: 'ستيک كنتور حريري', description: 'ستيک كنتور كريم بقوام قابل للمزج يمنح تحديدًا طبيعيًا.' },
    },
  },
  '23.png': {
    name: 'Rose Silk Face Cleanser',
    category: 'Skincare',
    price: 20.00,
    description: 'Low-foam cleanser with rose water that leaves skin soft and balanced.',
    translations: {
      fr: { name: 'Nettoyant Visage Soie Rose', description: 'Nettoyant doux à l’eau de rose, laisse la peau souple et équilibrée.' },
      ar: { name: 'منظف وجه حرير وردي', description: 'منظف لطيف بماء الورد يترك البشرة ناعمة ومتوازنة.' },
    },
  },
  '24.png': {
    name: 'Rose Gold Nail Lacquer',
    category: 'Beauty',
    price: 16.00,
    description: 'Chip-resistant nail lacquer in a chic rose-gold shade.',
    translations: {
      fr: { name: 'Vernis Or Rose', description: 'Vernis résistant aux éclats dans une teinte or rose élégante.' },
      ar: { name: 'طِلاء أظافر ذهب وردي', description: 'طِلاء أظافر مقاوم للتقشر بدرجة ذهبية وردية أنيقة.' },
    },
  },
  '25.png': {
    name: 'Silk Lash Mascara',
    category: 'Beauty',
    price: 24.00,
    description: 'Lengthening mascara with flexible brush for fanned-out lashes.',
    translations: {
      fr: { name: 'Mascara Cils Soie', description: 'Mascara allongeant à brosse flexible pour des cils déployés.' },
      ar: { name: 'ماسكارا حرير الرموش', description: 'ماسكارا مطولة بفرشاة مرنة لرموش متفتحة.' },
    },
  },
  '26.png': {
    name: 'Rose Repair Hair Mask',
    category: 'Haircare',
    price: 31.00,
    description: 'Deep conditioning hair mask to repair and strengthen strands.',
    translations: {
      fr: { name: 'Masque Cheveux Réparateur Rose', description: 'Masque nourrissant pour réparer et renforcer la fibre capillaire.' },
      ar: { name: 'قناع شعر إصلاح الورد', description: 'قناع عميق لتغذية الشعر وتقويته.' },
    },
  },
  '27.png': {
    name: 'Velvet Cheek Palette',
    category: 'Beauty',
    price: 36.00,
    description: 'Three-shade cheek palette for blush, bronzer, and highlight.',
    translations: {
      fr: { name: 'Palette Joues Velours', description: 'Palette trois teintes pour blush, bronzer et enlumineur.' },
      ar: { name: 'لوحة خدود مخملية', description: 'لوحة بثلاث درجات للبلاشر والبرونزر والهايلايتر.' },
    },
  },
  '28.png': {
    name: 'Rose Renewal Eye Cream',
    category: 'Skincare',
    price: 33.00,
    description: 'Peptide eye cream to smooth fine lines and reduce puffiness.',
    translations: {
      fr: { name: 'Crème Yeux Renouvellement Rose', description: 'Crème yeux aux peptides pour lisser les ridules et réduire les poches.' },
      ar: { name: 'كريم عين تجديد الورد', description: 'كريم عين بالبيبتيدات لتنعيم الخطوط وتقليل الانتفاخ.' },
    },
  },
  '29.png': {
    name: 'Gold Glow Body Oil',
    category: 'Bodycare',
    price: 29.00,
    description: 'Shimmering body oil that nourishes and gives a sunlit glow.',
    translations: {
      fr: { name: 'Huile Corps Éclat Doré', description: 'Huile scintillante qui nourrit et offre une lueur ensoleillée.' },
      ar: { name: 'زيت جسم بريق ذهبي', description: 'زيت جسم لامع يغذي ويمنح توهجًا مشرقًا.' },
    },
  },
  '30.png': {
    name: 'Silk Rose Toner',
    category: 'Skincare',
    price: 19.00,
    description: 'Balancing toner with rose extract to refine pores and calm skin.',
    translations: {
      fr: { name: 'Tonique Soie Rose', description: 'Tonique équilibrant à l’extrait de rose pour affiner les pores et apaiser la peau.' },
      ar: { name: 'تونر حرير وردي', description: 'تونر متوازن بخلاصة الورد لتنقية المسام وتهدئة البشرة.' },
    },
  },
  '31.png': {
    name: 'Golden Silk Hand Wash',
    category: 'Bodycare',
    price: 14.00,
    description: 'Gentle hand wash with subtle rose-gold aroma; leaves hands soft.',
    translations: {
      fr: { name: 'Gel Lavant Mains Soie Dorée', description: 'Gel lavant doux au parfum subtile or rose; mains douces.' },
      ar: { name: 'غسول يدين حرير ذهبي', description: 'غسول لطيف برائحة ذهبية وردية خفيفة يمنح نعومة لليدين.' },
    },
  },
  '32.png': {
    name: 'Rose Silk Body Scrub',
    category: 'Bodycare',
    price: 26.00,
    description: 'Sugar-based body scrub with rose petals to smooth and polish skin.',
    translations: {
      fr: { name: 'Gommage Corps Soie Rose', description: 'Gommage corps au sucre et pétales de rose pour lisser et polir.' },
      ar: { name: 'سكراب جسم حرير وردي', description: 'مقشر للجسم يعتمد على السكر مع بتلات الورد لتنعيم البشرة.' },
    },
  },
  '33.png': {
    name: 'Silk Finishing Powder',
    category: 'Beauty',
    price: 28.00,
    description: 'Translucent finishing powder that blurs imperfections and sets your look.',
    translations: {
      fr: { name: 'Poudre de Finition Soie', description: 'Poudre translucide qui floute les imperfections et fixe le teint.' },
      ar: { name: 'بودرة تثبيت حريرية', description: 'بودرة شفافة لتثبيت المظهر وتنعيم المظهر.' },
    },
  },
  '34.png': {
    name: 'Rose Gold Brush Set',
    category: 'Tools',
    price: 39.00,
    description: 'Five-piece brush set with soft synthetic bristles.',
    translations: {
      fr: { name: 'Kit Pinceaux Or Rose', description: 'Ensemble de 5 pinceaux aux poils synthétiques doux.' },
      ar: { name: 'طقم فرش ذهب وردي', description: 'مجموعة من خمس فرش بشعيرات صناعية ناعمة.' },
    },
  },
  '35.png': {
    name: 'Rose Silk Remover',
    category: 'Skincare',
    price: 18.00,
    description: 'Oil-based remover that melts away long-wear pigments.',
    translations: {
      fr: { name: 'Nettoyant Soie Rose', description: 'Nettoyant huile qui dissout les pigments longue tenue.' },
      ar: { name: 'مزيل شوائب حرير وردي', description: 'مزيل زيتي يزيل الألوان الثابتة بسهولة.' },
    },
  },
  '39.png': {
    name: 'Velvet Lip Liner',
    category: 'Beauty',
    price: 14.00,
    description: 'Creamy lip liner to define shape and prevent feathering.',
    translations: {
      fr: { name: 'Crayon Lèvres Velours', description: 'Crayon lèvres crémeux pour définir et éviter le débordement.' },
      ar: { name: 'قلم تحديد شفاه مخملي', description: 'قلم شفاه كريمي لتحديد الشكل ومنع الامتداد.' },
    },
  },
  '40.png': {
    name: 'Rose Silk Bath Salt',
    category: 'Bodycare',
    price: 20.00,
    description: 'Mineral bath salts with rose petals to relax body and mind.',
    translations: {
      fr: { name: 'Sel de Bain Soie Rose', description: 'Sels minéraux aux pétales de rose pour une détente profonde.' },
      ar: { name: 'أملاح حمام حرير وردي', description: 'أملاح معدنية مع بتلات الورد للاسترخاء للجسم والعقل.' },
    },
  },
  '41.png': {
    name: 'Golden Body Butter',
    category: 'Bodycare',
    price: 25.00,
    description: 'Rich body butter with cocoa and rose oils for intense nourishment.',
    translations: {
      fr: { name: 'Beurre Corps Doré', description: 'Beurre corporel riche au cacao et huiles de rose pour une nutrition intense.' },
      ar: { name: 'زبدة جسم ذهبية', description: 'زبدة جسم غنية بالكاكاو وزيوت الورد لتغذية عميقة.' },
    },
  },
  '43.png': {
    name: 'Silk Gel Eyeliner',
    category: 'Beauty',
    price: 19.00,
    description: 'Smudge-resistant gel eyeliner for precise and smooth lines.',
    translations: {
      fr: { name: 'Eyeliner Gel Soie', description: 'Eyeliner gel résistant, ligne précise et fluide.' },
      ar: { name: 'آيلاينر جل حريري', description: 'آيلاينر جل مقاوم للتلطخ يمنح خطوطًا دقيقة وسلسة.' },
    },
  },
  '44.png': {
    name: 'Rose Hydrating Sheet Mask',
    category: 'Skincare',
    price: 6.00,
    description: 'Hydrating sheet mask infused with rose essence for instant plumpness.',
    translations: {
      fr: { name: 'Masque Tissu Hydratant Rose', description: 'Masque tissu hydratant infusé d’essence de rose pour un rebond immédiat.' },
      ar: { name: 'قناع ورقي مرطب بالورد', description: 'قناع ورقي مرطب بخلاصة الورد يمنح امتلاءً فوريًا.' },
    },
  },
  '45.png': {
    name: 'Golden Hair Gloss',
    category: 'Haircare',
    price: 23.00,
    description: 'Finishing hair gloss that adds shine and tames flyaways.',
    translations: {
      fr: { name: 'Gloss Cheveux Doré', description: 'Fini gloss pour les cheveux, ajoute de la brillance et discipline les frisottis.' },
      ar: { name: 'جلس شعر ذهبي', description: 'لمسة نهائية للشعر تضيف لمعانًا وتقلل الشعيرات المتطايرة.' },
    },
  },
  '46.png': {
    name: 'Rose Velvet Nail Care Set',
    category: 'Bodycare',
    price: 27.00,
    description: 'Manicure care set with nourishing oil and buffer for healthy nails.',
    translations: {
      fr: { name: 'Set Soin Ongles Velours Rose', description: 'Kit manucure avec huile nourrissante et polissoir pour des ongles sains.' },
      ar: { name: 'طقم عناية بالأظافر مخملي وردي', description: 'طقم عناية يتضمن زيتًا مغذيًا ومبردًا لأظافر صحية.' },
    },
  },
};

// Build product objects from images directory and metadata
const buildProductsFromImages = () => {
  try {
    const imagesDir = path.resolve(__dirname, '..', '..', 'client', 'public', 'images');
    const files = fs.readdirSync(imagesDir);
    const pngs = files.filter(f => /\.png$/i.test(f));
    const exclude = ["Capture d'écran 2026-01-08 171444.png"];
    const candidates = pngs.filter(f => !exclude.includes(f));
    const products = candidates.map((file) => {
      const meta = imageProductMeta[file];
      const name = meta?.name || buildNameFromFilename(file);
      const category = meta?.category || 'Collection';
      const price = meta?.price ?? 25.00;
      const description = meta?.description || 'A carefully crafted beauty item from our rose-gold collection.';
      const translations = meta?.translations
        ? {
            en: { name, description },
            fr: { name: meta.translations.fr.name, description: meta.translations.fr.description },
            ar: { name: meta.translations.ar.name, description: meta.translations.ar.description },
          }
        : {
            en: { name, description },
            fr: { name, description: 'Un article de beauté soigneusement conçu de notre collection or rose.' },
            ar: { name, description: 'منتج عناية جمال مصمم بعناية من مجموعتنا الذهبية الوردية.' },
          };
      return {
        name,
        description,
        price,
        category,
        image: file,
        countInStock: 30,
        rating: 4.6,
        numReviews: 0,
        translations,
      };
    });
    return products;
  } catch (e) {
    return [];
  }
};

let seedPromise = null;

const ensureProductsSeeded = async () => {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await Product.countDocuments();
    if (count > 0) return;
    const built = buildProductsFromImages();
    if (built.length > 0) {
      await Product.insertMany(built);
      console.log('Data Seeded from images');
    }
  })().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
};

// @desc    Fetch all products with filters, search and sort
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    await ensureProductsSeeded();

    const { keyword, category, sort } = req.query;

    let query = {};

    // 1. Keyword Search (Name or Description)
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { 'translations.fr.name': { $regex: keyword, $options: 'i' } },
        { 'translations.fr.description': { $regex: keyword, $options: 'i' } },
        { 'translations.ar.name': { $regex: keyword, $options: 'i' } },
        { 'translations.ar.description': { $regex: keyword, $options: 'i' } },
      ];
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // 3. Sorting
    let sortOptions = { createdAt: -1 }; // Default: Newest
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'rating') {
      sortOptions = { rating: -1 };
    }

    const finalProducts = await Product.find(query)
      .populate('reviews.user', 'name')
      .sort(sortOptions);

    res.json(finalProducts);
  } catch (error) {
    console.error('getProducts Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get top selling / highest rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = async (req, res) => {
  try {
    await ensureProductsSeeded();
    // For now, let's use highest rated as "Best Sellers" proxy
    const products = await Product.find({})
      .sort({ rating: -1, numReviews: -1 })
      .limit(6);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getTopProducts,
  addProductReview: async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const productId = req.params.id;

      // Validate inputs
      if (rating === undefined || rating === null) {
         res.status(400);
         throw new Error('Rating is required');
      }
      if (Number(rating) < 0 || Number(rating) > 5) {
         res.status(400);
         throw new Error('Rating must be between 0 and 5');
      }
      if (!comment) {
         res.status(400);
         throw new Error('Comment is required');
      }

      const product = await Product.findById(productId);

      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }

      const alreadyReviewed = (product.reviews || []).find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        res.status(400);
        throw new Error('Product already reviewed');
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment: String(comment),
        user: req.user._id,
        createdAt: new Date(),
      };

      product.reviews.push(review);

      product.numReviews = product.reviews.length;

      const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
      product.rating = totalRating / product.reviews.length;
      
      // Ensure rating is valid number
      if (isNaN(product.rating)) product.rating = 0;
      
      // Fix decimal places
      product.rating = Number(product.rating.toFixed(2));

      const savedProduct = await product.save();
      
      broadcastEvent({ channel: 'product', type: 'product_updated', product: savedProduct });
      broadcastEvent({ channel: 'product', type: 'review_created', review, productId: product._id, productName: product.name });

      res.status(201).json(review);
    } catch (error) {
       console.error('Review Error:', error);
       const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
       res.status(statusCode).json({ message: error.message || 'Review failed' });
    }
  },
  createProduct: async (req, res) => {
    try {
      const product = await Product.create({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        image: req.body.image,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: 0,
        numReviews: 0,
        translations: req.body.translations,
      });

      broadcastEvent({ channel: 'product', type: 'product_created', product });
      res.status(201).json(product);
    } catch (error) {
      const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
      res.status(statusCode).json({ message: error.message || 'Product creation failed' });
    }
  },
  deleteProductReview: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (product) {
        const review = product.reviews.find(
          (r) => r._id.toString() === req.params.reviewId.toString()
        );

        if (!review) {
          res.status(404);
          throw new Error('Review not found');
        }

        product.reviews = product.reviews.filter(
          (r) => r._id.toString() !== req.params.reviewId.toString()
        );

        product.numReviews = product.reviews.length;

        if (product.reviews.length > 0) {
          const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
          product.rating = totalRating / product.reviews.length;
          // Fix decimal places
          product.rating = Number(product.rating.toFixed(2));
        } else {
          product.rating = 0;
        }

        await product.save();
        res.json({ message: 'Review removed' });
      } else {
        res.status(404);
        throw new Error('Product not found');
      }
    } catch (error) {
      const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
      res.status(statusCode).json({ message: error.message || 'Review deletion failed' });
    }
  },
  updateProduct: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      product.name = req.body.name ?? product.name;
      product.description = req.body.description ?? product.description;
      product.price = req.body.price ?? product.price;
      product.category = req.body.category ?? product.category;
      product.image = req.body.image ?? product.image;
      product.countInStock = req.body.countInStock ?? product.countInStock;
      if (req.body.translations) {
        product.translations = req.body.translations;
      }
      const saved = await product.save();
      broadcastEvent({ channel: 'product', type: 'product_updated', product: saved });
      res.json(saved);
    } catch (error) {
      res.status(400).json({ message: 'Update product failed' });
    }
  },
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      await product.deleteOne();
      broadcastEvent({ channel: 'product', type: 'product_deleted', id: req.params.id });
      res.json({ message: 'Product removed' });
    } catch (error) {
      res.status(400).json({ message: 'Delete product failed' });
    }
  },
  getCategories: async (req, res) => {
    try {
      const cats = await Product.distinct('category');
      res.json(cats);
    } catch (error) {
      res.status(500).json({ message: 'Server Error' });
    }
  },
};
