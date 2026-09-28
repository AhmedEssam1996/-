#!/usr/bin/env node
/**
 * DEMO DATA ONLY.
 *
 *   npm run db:seed          → insert realistic Arabic demo data
 *   npm run db:seed:clear    → remove every demo row (real data is untouched)
 *
 * Everything written here is tagged `is_demo = true` on its row, and every
 * analytics query in the app filters demo rows out by default. That is the
 * "DEMO DATA vs REAL DATA" separation: the admin dashboard reports REAL numbers,
 * and demo rows can be wiped in a single call without affecting production data.
 */
import { randomUUID } from 'node:crypto';

import { banner, connectDb, daysAgo, fail, info, ok, slugify } from './_shared.mjs';

const DEMO_PASSWORD = 'DemoPassw0rd!';

const DEMO_USERS = [
  { name: 'سارة محمود', email: 'sara@demo.hadiya.local', source: 'google' },
  { name: 'أحمد الشريف', email: 'ahmed@demo.hadiya.local', source: 'email' },
  { name: 'منى عبد الله', email: 'mona@demo.hadiya.local', source: 'email' },
  { name: 'يوسف حمدان', email: 'youssef@demo.hadiya.local', source: 'google' },
  { name: 'ليلى فؤاد', email: 'laila@demo.hadiya.local', source: 'email' },
  { name: 'كريم نصار', email: 'karim@demo.hadiya.local', source: 'email' },
];

const TEMPLATES = [
  {
    slug: 'love-letter',
    title_ar: 'رسالة حب',
    title_en: 'Love Letter',
    description_ar: 'رسالة رومانسية بتصميم أنيق، مع موسيقى هادئة وأنيميشن فتح الهدية.',
    category: 'romantic',
    emoji: '❤️',
    gradient: 'from-[#FF4D8D] via-[#8B5CF6] to-[#07090D]',
    accent: '#FF4D8D',
    position: 10,
  },
  {
    slug: 'anniversary',
    title_ar: 'ذكرى سنوية',
    title_en: 'Anniversary',
    description_ar: 'عدّاد للأيام اللي عشتم فيها مع بعض، ومعرض صور للمحطات المهمة.',
    category: 'romantic',
    emoji: '💕',
    gradient: 'from-[#8B5CF6] via-[#FF4D8D] to-[#07090D]',
    accent: '#8B5CF6',
    position: 20,
  },
  {
    slug: 'romantic-story',
    title_ar: 'قصة حب',
    title_en: 'Romantic Story',
    description_ar: 'احكي حكايتكم من أول لقاء لحد النهارده في شكل قصة تفاعلية.',
    category: 'romantic',
    emoji: '🌹',
    gradient: 'from-[#FF4D8D] via-[#F5C451] to-[#07090D]',
    accent: '#FF4D8D',
    position: 30,
  },
  {
    slug: 'birthday-surprise',
    title_ar: 'مفاجأة عيد ميلاد',
    title_en: 'Birthday Surprise',
    description_ar: 'تورتة متحركة، بالونات، وكونفيتي وقت فتح الهدية.',
    category: 'birthday',
    emoji: '🎂',
    gradient: 'from-[#F5C451] via-[#FF4D8D] to-[#07090D]',
    accent: '#F5C451',
    position: 40,
  },
  {
    slug: 'birthday-card',
    title_ar: 'كارت عيد ميلاد',
    title_en: 'Birthday Card',
    description_ar: 'كارت بسيط وأنيق مع رسالة قصيرة وأمنية من القلب.',
    category: 'birthday',
    emoji: '🎉',
    gradient: 'from-[#00D6A3] via-[#F5C451] to-[#07090D]',
    accent: '#00D6A3',
    position: 50,
  },
  {
    slug: 'interactive-birthday',
    title_ar: 'عيد ميلاد تفاعلي',
    title_en: 'Interactive Birthday',
    description_ar: 'سيكشنات تفاعلية: عدّاد، كويز عن الشخص، وفي الآخر مفاجأة.',
    category: 'birthday',
    emoji: '🎁',
    gradient: 'from-[#8B5CF6] via-[#00D6A3] to-[#07090D]',
    accent: '#8B5CF6',
    position: 60,
  },
  {
    slug: 'best-friend',
    title_ar: 'صاحبي المفضل',
    title_en: 'Best Friend',
    description_ar: 'مواقفكم المشتركة، الذكريات الحلوة، ورسالة صداقة صادقة.',
    category: 'friendship',
    emoji: '🧑‍🤝‍🧑',
    gradient: 'from-[#00D6A3] via-[#8B5CF6] to-[#07090D]',
    accent: '#00D6A3',
    position: 70,
  },
  {
    slug: 'funny-friend',
    title_ar: 'صاحب مضحك',
    title_en: 'Funny Friend',
    description_ar: 'هدية كلها هزار ومواقف مضحكة وإفشات بينكم.',
    category: 'friendship',
    emoji: '😂',
    gradient: 'from-[#F5C451] via-[#00D6A3] to-[#07090D]',
    accent: '#F5C451',
    position: 80,
  },
  {
    slug: 'gaming-friend',
    title_ar: 'صاحب الجيمينج',
    title_en: 'Gaming Friend',
    description_ar: 'ريلود الذكريات في اللعب، وتحديات، وشهادة إنجاز جيمينج.',
    category: 'friendship',
    emoji: '🎮',
    gradient: 'from-[#8B5CF6] via-[#00D6A3] to-[#07090D]',
    accent: '#8B5CF6',
    position: 90,
  },
  {
    slug: 'mom',
    title_ar: 'لأمي',
    title_en: 'Mom',
    description_ar: 'رسالة امتنان لأمي مع ذكريات الطفولة ودعاء من القلب.',
    category: 'family',
    emoji: '👩',
    gradient: 'from-[#FF4D8D] via-[#F5C451] to-[#07090D]',
    accent: '#FF4D8D',
    position: 100,
  },
  {
    slug: 'dad',
    title_ar: 'لأبويا',
    title_en: 'Dad',
    description_ar: 'كلمة تقدير لأبويا، وذكريات الدروس اللي علمني إياها.',
    category: 'family',
    emoji: '👨',
    gradient: 'from-[#8B5CF6] via-[#00D6A3] to-[#07090D]',
    accent: '#8B5CF6',
    position: 110,
  },
  {
    slug: 'family',
    title_ar: 'للعيلة',
    title_en: 'Family',
    description_ar: 'ألبوم عائلي تفاعلي لكل أفراد الأسرة.',
    category: 'family',
    emoji: '👨‍👩‍👧',
    gradient: 'from-[#00D6A3] via-[#F5C451] to-[#07090D]',
    accent: '#00D6A3',
    position: 120,
  },
  {
    slug: 'parents',
    title_ar: 'للوالدين',
    title_en: 'Parents',
    description_ar: 'هدية تجمع امتنانك لبابا وماما في مكان واحد.',
    category: 'family',
    emoji: '❤️',
    gradient: 'from-[#FF4D8D] via-[#8B5CF6] to-[#07090D]',
    accent: '#FF4D8D',
    position: 130,
  },
  {
    slug: 'graduation',
    title_ar: 'تخرج',
    title_en: 'Graduation',
    description_ar: 'احتفال بالتخرج مع مسيرتك الدراسية وشهادة تقدير.',
    category: 'professional',
    emoji: '🎓',
    gradient: 'from-[#00D6A3] via-[#8B5CF6] to-[#07090D]',
    accent: '#00D6A3',
    position: 140,
  },
  {
    slug: 'appreciation',
    title_ar: 'شكر وتقدير',
    title_en: 'Appreciation',
    description_ar: 'رسالة شكر رسمية وأنيقة لزميل أو مدير.',
    category: 'professional',
    emoji: '💼',
    gradient: 'from-[#8B5CF6] via-[#00D6A3] to-[#07090D]',
    accent: '#8B5CF6',
    position: 150,
  },
  {
    slug: 'congratulations',
    title_ar: 'مبروك',
    title_en: 'Congratulations',
    description_ar: 'تهنئة على نجاح أو إنجاز جديد بشكل احترافي.',
    category: 'professional',
    emoji: '🏆',
    gradient: 'from-[#F5C451] via-[#FF4D8D] to-[#07090D]',
    accent: '#F5C451',
    position: 160,
  },
  {
    slug: 'roast',
    title_ar: 'إفشات',
    title_en: 'Roast',
    description_ar: 'هدية هزار على صاحبك — كل حاجة فيها بضحّك.',
    category: 'funny',
    emoji: '😂',
    gradient: 'from-[#FF4D8D] via-[#F5C451] to-[#07090D]',
    accent: '#FF4D8D',
    position: 170,
  },
  {
    slug: 'inside-joke',
    title_ar: 'نكتتنا الخاصة',
    title_en: 'Inside Joke',
    description_ar: 'الجملة اللي محدش يفهمها غيركم، في هدية.',
    category: 'funny',
    emoji: '🤣',
    gradient: 'from-[#F5C451] via-[#00D6A3] to-[#07090D]',
    accent: '#F5C451',
    position: 180,
  },
  {
    slug: 'funny-certificate',
    title_ar: 'شهادة مضحكة',
    title_en: 'Funny Certificate',
    description_ar: 'شهادة رسمية بشكل ساخر لأعظم إنجاز تافه.',
    category: 'funny',
    emoji: '🏅',
    gradient: 'from-[#8B5CF6] via-[#F5C451] to-[#07090D]',
    accent: '#8B5CF6',
    position: 190,
  },
];

const DEMO_GIFTS = [
  {
    title: 'كل سنة وأنت أجمل 💕',
    recipient: 'سارة',
    occasion: 'عيد ميلاد',
    category: 'birthday',
    template: 'birthday-surprise',
    type: 'experience',
    status: 'PUBLISHED',
    days: 21,
    opens: 17,
    intro: 'سارة… السنة دي مقررت أعمل حاجة مختلفة، حاجة تفضل معاكِ مش بس يوم وتخلص.',
    final: 'كل سنة وأنتِ أجمل، وكل سنة وأنتِ أقرب لقلبي. عقبال ١٠٠ سنة وأنا جنبك. ❤️',
    sections: [
      ['story', 'أول مرة شفتك', 'كان يوم عادي جدًا في ظاهره، بس أنا خرجت منه وإحساسي مختلف. من ساعتها كل التفاصيل الصغيرة بقت لها معنى.'],
      ['memory', 'رحلة الساحل', 'الطريق الطويل، الأغاني اللي غنيناها غلط، والمعمعة اللي عملناها لما تعطلت العربية. لحد دلوقتي بضحك لما أفتكر.'],
      ['message', 'حاجة عايز أقولها', 'أنتِ مش بس حبيبتي، أنتِ الشخص اللي بيهدى دماغي. وجودك في يومي بيفرق أكتر من أي حاجة.'],
    ],
  },
  {
    title: '٧ سنين صحاب 🎮',
    recipient: 'أحمد',
    occasion: 'ذكرى',
    category: 'friendship',
    template: 'gaming-friend',
    type: 'experience',
    status: 'PUBLISHED',
    days: 14,
    opens: 23,
    intro: 'أحمد… ٧ سنين ومحصلش حاجة تستاهل نتفرق عليها. خلّينا نفتكر البدايات.',
    final: 'مهما الدنيا شغلتنا، انت هتفضل الجو اللي بارتاح فيه. صاحبي على طول.',
    sections: [
      ['story', 'أول مباراة', 'قعدنا ٦ ساعات متواصلة وإنتهت بهزيمة مذلة، ومن ساعتها بقينا فريق.'],
      ['memory', 'ليالي الجامعة', 'المشروع اللي سلمناه في آخر ساعة، والمصطلحات اللي لسه بنقولها لحد دلوقتي.'],
      ['quiz', 'تحدي الصحاب', 'مين فينا اللي دايماً بيتأخر؟ ومين اللي دايماً بيدفع الحساب؟'],
    ],
  },
  {
    title: 'لأمي… كل حاجة ❤️',
    recipient: 'أمي',
    occasion: 'عيد الأم',
    category: 'family',
    template: 'mom',
    type: 'experience',
    status: 'PUBLISHED',
    days: 9,
    opens: 41,
    intro: 'مش هعرف أرد جميلك بكلام، بس هحاول أقول جزء منه.',
    final: 'أنا اللي أنا عليه النهارده بفضلك. ربنا يخليكِ ليّا يا أغلى حاجة في حياتي.',
    sections: [
      ['story', 'وصفة الملوخية', 'كل مرة أجرب أعملها بنفس الطعم، مبيطلعش زيها. تقريبًا الطعم بتاعك سر مش بيتنقل.'],
      ['memory', 'امتحان الثانوية', 'صحيانية الفجر، والدعاء اللي سمعته وأنا نايم.'],
      ['message', 'اعتذار', 'معلش على كل مرة عصبت عليك، أو كنت مشغول. مكنتش أقصد.'],
    ],
  },
  {
    title: 'مبروك التخرج 🎓',
    recipient: 'منى',
    occasion: 'تخرج',
    category: 'professional',
    template: 'graduation',
    type: 'story',
    status: 'PUBLISHED',
    days: 6,
    opens: 12,
    intro: 'منى… اليوم اللي تعبتي فيه سنين، وصل أخيرًا.',
    final: 'شكرًا لكل مرة ساعدتيني فيها في الواجبات. مبروك يا دكتورة المستقبل!',
    sections: [
      ['story', 'قاعة المحاضرات', 'من أول محاضرة كنتي الشاطرة، وأنا اللي بيسألك على الملخصات.'],
      ['quote', 'جملة منك', '"اللي بيتعب، بيوصل." وأنتِ أكبر دليل.'],
    ],
  },
  {
    title: 'حاجة بسيطة لأبويا 👨',
    recipient: 'أبويا',
    occasion: 'شكر',
    category: 'family',
    template: 'dad',
    type: 'message',
    status: 'PUBLISHED',
    days: 4,
    opens: 8,
    intro: 'بابا… مش بحكيلك حاجات كتير، بس النهارده هحاول.',
    final: 'ربنا يطول عمرك ويخليك سندنا. أنا بتعلم منك كل يوم.',
    sections: [
      ['message', 'تعليمك ليّا', 'علمتني إن الراجل لازم يقف على رجليه، وإن الوفاء مش كلام.'],
      ['memory', 'الورشة', 'كل مرة كنت بتيجي تشوفني وأنا بتعلم، كانت عينك بتقول كل حاجة.'],
    ],
  },
  {
    title: 'مسودة: مفاجأة ليلى 🎂',
    recipient: 'ليلى',
    occasion: 'عيد ميلاد',
    category: 'birthday',
    template: 'interactive-birthday',
    type: 'experience',
    status: 'DRAFT',
    days: 2,
    opens: 0,
    intro: 'لسه بجهزها…',
    final: 'لسه هكتب آخر جملة.',
    sections: [['story', 'عنوان مؤقت', 'محتوى مبدئي يحتاج تعديل.']],
  },
  {
    title: 'مسودة: شكرًا كريم 💼',
    recipient: 'كريم',
    occasion: 'شكر',
    category: 'professional',
    template: 'appreciation',
    type: 'message',
    status: 'DRAFT',
    days: 1,
    opens: 0,
    intro: 'مقدمة مبدئية.',
    final: 'خاتمة مبدئية.',
    sections: [['message', 'مؤقت', 'نص مبدئي.']],
  },
];

const PAGES = ['/', '/ai-gift-finder', '/templates', '/create', '/create/message', '/dashboard', '/login'];
const EVENTS = [
  'page_view',
  'landing_view',
  'gift_builder_open',
  'ai_generation',
  'gift_created',
  'gift_published',
  'gift_opened',
  'gift_shared',
  'template_selected',
  'message_generated',
];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const SOURCES = ['direct', 'google', 'instagram', 'twitter', 'whatsapp'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function clearDemo(client) {
  banner('Removing demo data');
  const { rowCount: opens } = await client.query('delete from public.gift_opens where is_demo');
  const { rowCount: gifts } = await client.query('delete from public.gifts where is_demo');
  const { rowCount: aiRows } = await client.query('delete from public.ai_generations where is_demo');
  const { rowCount: events } = await client.query('delete from public.analytics_events where is_demo');
  const { rowCount: profiles } = await client.query('delete from public.profiles where is_demo');
  const { rowCount: removedUsers } = await client.query(
    "delete from auth.users where email like '%@demo.hadiya.local'",
  );
  const { rowCount: templates } = await client.query('delete from public.gift_templates where is_demo');

  info(`gift_opens removed:        ${opens ?? 0}`);
  info(`gifts removed:             ${gifts ?? 0}`);
  info(`ai_generations removed:    ${aiRows ?? 0}`);
  info(`analytics_events removed:  ${events ?? 0}`);
  info(`profiles removed:          ${profiles ?? 0}`);
  info(`auth users removed:        ${removedUsers ?? 0}`);
  info(`demo templates removed:    ${templates ?? 0}`);
  ok('Demo data cleared. Real data was not touched.');
}

async function seed(client) {
  banner('Seeding Hadiya demo data');
  info('Every row written here carries is_demo = true.');
  info('Analytics queries exclude demo rows, so the admin dashboard stays REAL.');

  // ---------------------------------------------------------------- templates
  const templateIds = new Map();
  for (const t of TEMPLATES) {
    const { rows } = await client.query(
      `insert into public.gift_templates
         (slug, title_ar, title_en, description_ar, category, emoji, gradient, accent,
          type, position, is_demo, is_active, default_sections)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'experience',$9,true,true,$10::jsonb)
       on conflict (slug) do update set
         title_ar = excluded.title_ar,
         title_en = excluded.title_en,
         description_ar = excluded.description_ar,
         category = excluded.category,
         emoji = excluded.emoji,
         gradient = excluded.gradient,
         accent = excluded.accent,
         position = excluded.position,
         is_demo = true
       returning id`,
      [
        t.slug,
        t.title_ar,
        t.title_en,
        t.description_ar,
        t.category,
        t.emoji,
        t.gradient,
        t.accent,
        t.position,
        JSON.stringify([
          { type: 'cover', title: t.title_ar, content: t.description_ar },
          { type: 'message', title: 'رسالتك', content: 'اكتب رسالتك هنا…' },
          { type: 'final', title: 'المفاجأة الأخيرة', content: 'جملة الختام…' },
        ]),
      ],
    );
    templateIds.set(t.slug, rows[0].id);
  }
  ok(`${TEMPLATES.length} demo templates ready`);

  // -------------------------------------------------------------------- users
  const userIds = {};
  for (const [index, u] of DEMO_USERS.entries()) {
    const existing = await client.query('select id from auth.users where lower(email) = $1', [
      u.email,
    ]);

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      const { rows } = await client.query(
        `insert into auth.users
           (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
         values
           ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            $1, crypt($2, gen_salt('bf')), now(),
            jsonb_build_object('provider', $3, 'providers', jsonb_build_array($3)),
            jsonb_build_object('full_name', $4::text, 'signup_source', $3::text),
            $5, $5, $6)
         returning id`,
        [u.email, DEMO_PASSWORD, u.source, u.name, daysAgo(randInt(3, 60), randInt(8, 22)), daysAgo(randInt(0, 3))],
      );
      userId = rows[0].id;

      await client.query(
        `insert into auth.identities
           (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values (gen_random_uuid(), $1, $2,
                 jsonb_build_object('sub', $1::text, 'email', $1::text, 'email_verified', true),
                 $3, now(), now(), now())`,
        [userId, userId, u.source],
      );
    }

    await client.query(
      `insert into public.profiles (id, email, full_name, signup_source, is_demo, created_at, last_seen_at)
       values ($1, $2, $3, $4, true, $5, $6)
       on conflict (id) do update set is_demo = true, full_name = excluded.full_name`,
      [userId, u.email, u.name, u.source, daysAgo(randInt(3, 60)), daysAgo(randInt(0, 2))],
    );

    await client.query(
      `insert into public.user_roles (user_id, role) values ($1, 'USER')
       on conflict (user_id) do nothing`,
      [userId],
    );

    userIds[u.email] = userId;
    info(`demo user ${u.email} (${index + 1}/${DEMO_USERS.length})`);
  }
  ok(`${DEMO_USERS.length} demo users ready — password: ${DEMO_PASSWORD}`);

  // -------------------------------------------------------------------- gifts
  const emails = Object.keys(userIds);
  const giftIds = [];

  for (const g of DEMO_GIFTS) {
    const owner = userIds[emails[randInt(0, emails.length - 1)]];
    const createdAt = daysAgo(g.days, randInt(9, 21));
    const { rows } = await client.query(
      `insert into public.gifts
         (user_id, title, slug, category, template_id, type, status, visibility,
          content_json, recipient_name, occasion, source, is_demo, created_at, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,'unlisted',$8::jsonb,$9,$10,'seed',true,$11,$12)
       on conflict (slug) do nothing
       returning id`,
      [
        owner,
        g.title,
        `${slugify(g.title)}-${g.days}${g.opens}`.slice(0, 60),
        g.category,
        g.template ? templateIds.get(g.template) : null,
        g.type,
        g.status,
        JSON.stringify({ intro: g.intro, final_message: g.final, theme: 'aurora' }),
        g.recipient,
        g.occasion,
        createdAt,
        g.status === 'PUBLISHED' ? createdAt : null,
      ],
    );

    if (rows.length === 0) continue;
    const giftId = rows[0].id;
    giftIds.push(giftId);

    for (const [position, s] of g.sections.entries()) {
      await client.query(
        `insert into public.gift_sections (gift_id, type, position, content_json)
         values ($1,$2,$3,$4::jsonb)`,
        [giftId, s[0], position, JSON.stringify({ title: s[1], content: s[2] })],
      );
    }

    // Opening sessions for published gifts.
    for (let i = 0; i < g.opens; i += 1) {
      await client.query(
        `insert into public.gift_opens (gift_id, session_id, opened_at, duration_seconds, device, browser, is_demo)
         values ($1,$2,$3,$4,$5,$6,true)
         on conflict (gift_id, session_id) do nothing`,
        [
          giftId,
          `seed_${randomUUID()}`,
          daysAgo(randInt(0, Math.max(1, g.days)), randInt(8, 23)),
          randInt(35, 420),
          pick(DEVICES),
          pick(BROWSERS),
        ],
      );
    }

    info(`gift "${g.title}" — ${g.status}, ${g.opens} opens`);
  }
  ok(`${giftIds.length} demo gifts ready`);

  // -------------------------------------------------------- ai + analytics
  let aiCount = 0;
  const features = ['gift_suggestions', 'message', 'gift_experience', 'story'];
  for (let day = 45; day >= 0; day -= 1) {
    const perDay = randInt(2, 11);
    for (let i = 0; i < perDay; i += 1) {
      const owner = userIds[emails[randInt(0, emails.length - 1)]];
      await client.query(
        `insert into public.ai_generations
           (user_id, feature, model, provider, status, input_tokens, output_tokens, latency_ms, is_demo, created_at)
         values ($1,$2,'demo/model','mock',$3,$4,$5,$6,true,$7)`,
        [
          owner,
          pick(features),
          Math.random() > 0.06 ? 'success' : 'error',
          randInt(220, 900),
          randInt(300, 1600),
          randInt(900, 5400),
          daysAgo(day, randInt(8, 23)),
        ],
      );
      aiCount += 1;
    }
  }
  ok(`${aiCount} demo AI generations ready`);

  let eventCount = 0;
  for (let day = 60; day >= 0; day -= 1) {
    const sessions = randInt(14, 52);
    for (let s = 0; s < sessions; s += 1) {
      const sessionId = `seed_${randomUUID()}`;
      const converted = Math.random() > 0.82;
      const owner = converted ? userIds[emails[randInt(0, emails.length - 1)]] : null;
      const when = daysAgo(day, randInt(0, 23));
      const device = pick(DEVICES);
      const browser = pick(BROWSERS);
      const source = pick(SOURCES);

      await client.query(
        `insert into public.analytics_events
           (user_id, session_id, event_name, page, source, device, browser, is_demo, created_at)
         values ($1,$2,'page_view','/',$3,$4,$5,true,$6)`,
        [owner, sessionId, source, device, browser, when],
      );

      const extra = randInt(0, 4);
      for (let e = 0; e < extra; e += 1) {
        await client.query(
          `insert into public.analytics_events
             (user_id, session_id, event_name, page, source, device, browser, is_demo, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
          [owner, sessionId, pick(EVENTS), pick(PAGES), source, device, browser, when],
        );
        eventCount += 1;
      }
      eventCount += 1;
    }
  }
  ok(`${eventCount} demo analytics events ready`);
  console.log();
  ok('Seed complete. Run `npm run db:seed:clear` to remove all of it.');
}

async function main() {
  const shouldClear = process.argv.includes('--clear');
  const client = await connectDb();
  try {
    if (shouldClear) {
      await clearDemo(client);
    } else {
      await seed(client);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  fail(error.message);
  process.exit(1);
});