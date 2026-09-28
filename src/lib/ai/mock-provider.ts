import 'server-only';

import type { GenerateOptions } from '@/lib/ai/provider';

/**
 * Offline deterministic provider.
 *
 * Purpose: let the entire product be built, demoed and tested end-to-end before
 * an OPENROUTER_API_KEY exists. It is not a stub that returns `{}` — it returns
 * genuinely schema-valid Arabic content, so the UI, validation, persistence and
 * rendering paths are all exercised for real.
 *
 * Safety rules it respects:
 *  • Never runs in production (enforced in provider.ts getActiveProvider()).
 *  • Output is labelled so the UI can show a "وضع تجريبي" badge — demo content
 *    must never be mistaken for real AI output.
 *  • Deterministic per feature, so tests are stable.
 */

const RELATIONSHIP_AR: Record<string, string> = {
  romantic: 'حبيب/حبيبة',
  partner: 'زوج/زوجة',
  friend: 'صديق',
  sibling: 'أخ/أخت',
  mother: 'أم',
  father: 'أب',
  colleague: 'زميل',
  other: 'شخص عزيز',
};

const TONE_AR: Record<string, string> = {
  romantic: 'رومانسي',
  emotional: 'عاطفي',
  funny: 'مضحك',
  light: 'خفيف',
  formal: 'رسمي',
  casual: 'عفوي',
};

function readMeta(messages: GenerateOptions['messages']): Record<string, string> {
  // The service layer embeds a compact JSON hint in the first user message so the
  // mock provider can tailor its output without a second code path.
  const first = messages.find((m) => m.role === 'user')?.content ?? '';
  const match = /<hadiya-mock-params>([\s\S]*?)<\/hadiya-mock-params>/.exec(first);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function suggestions(meta: Record<string, string>): string {
  const recipient = meta.recipient || meta.relationship || 'الشخص العزيز';
  const occasion = meta.occasion || 'بدون مناسبة';
  const interests = meta.interests || 'حاجات بسيطة بتفرحه';

  return JSON.stringify({
    suggestions: [
      {
        title: 'رسالة تفاعلية من القلب',
        description: `صفحة هدية بتفتح بأنيميشن، فيها رسالة مكتوبة بأسلوبك عن ${recipient}، ومعاها الذكريات المشتركة بينكم.`,
        reason: `المناسبة (${occasion}) محتاجة كلام صادق أكتر من أي حاجة مادية، والرسالة بتفضل معاه للأبد.`,
        type: 'message',
        personalization: `ابدأ بأول مرة اتقابلتوا، واذكر تفصيلة صغيرة عن ${interests} عشان يحس إن الهدية مخصوصة ليه.`,
      },
      {
        title: 'ألبوم ذكريات مرتب',
        description: `سيكشنات كل واحدة فيها صورة وموقف، ومعاهم تعليق قصير منك. الترتيب بيمشي من أقدم ذكرى لأحدثها.`,
        reason: `${interests} بتبقى أعمق لما ترتبط بموقف حصل فعلًا، والصورة بتفضل في الدماغ أكتر من الكلام.`,
        type: 'image',
        personalization: `اختار ٥ مواقف بس، وخلي كل موقف فيه جملة واحدة محدش غيركم يفهمها.`,
      },
      {
        title: 'تحدي صغير عنكم',
        description: 'كويز بسيط بأسئلة عن ذكرياتكم، والإجابة الصحيحة بتكشف جزء من المفاجأة.',
        reason: 'التفاعل بيخلي الشخص يفضل في الصفحة أطول، وبيحس إن فيه حاجة مستنياه في الآخر.',
        type: 'interactive',
        personalization: `اعمل ٤ أسئلة، وواحد منهم إجابته مضحكة عن حاجة حصلت في ${occasion}.`,
      },
      {
        title: 'عدّاد للمناسبة الجاية',
        description: 'سيكشن فيه عدّاد تنازلي للمناسبة الجاية، ومعاه أمنية مكتوبة منك.',
        reason: 'بيخلي الهدية مستمرة مش لحظة وخلاص — كل ما يفتحها يفتكر إن فيه حاجة جاية.',
        type: 'interactive',
        personalization: `حط تاريخ المناسبة الجاية وحط قبلها جملة: "وعد مني…"`,
      },
      {
        title: 'شهادة تقدير بشخصيته',
        description: 'شهادة بشكل احترافي فيها لقب مضحك أو مؤثر، وسبب إنه يستاهلها.',
        reason: 'تقدير صريح بيوصل أكتر من الهدايا المادية، خصوصًا لو اللقب مخصوص على شخصيته.',
        type: 'story',
        personalization: `اختار لقب مرتبط بـ ${interests}، واكتب سبب واحد بس بيخليه يستاهله.`,
      },
    ],
  });
}

function message(meta: Record<string, string>): string {
  const relationship = RELATIONSHIP_AR[meta.relationship ?? ''] ?? 'شخص عزيز';
  const tone = TONE_AR[meta.tone ?? ''] ?? 'عاطفي';
  const recipient = meta.recipient || relationship;
  const context = meta.context || 'كل اللحظات الحلوة اللي عشناها مع بعض';
  const length = meta.length || 'medium';

  const short = [
    `${recipient}، مفيش كلام يوصل اللي جوايا، بس حبيت أقولك إن وجودك في حياتي أحلى حاجة حصلتلي.`,
    `كل سنة وأنت الأجمل. ${context} — وكل يوم معاك بيبقى أحلى من اللي قبله.`,
  ];

  const medium = [
    `${recipient}،`,
    `مش عارف أبدأ منين، بس خليني أقولك حاجة بسيطة: انت مش شخص عادي في حياتي.`,
    `${context} كلها بتفضل معايا، وكل تفصيلة صغيرة بتفكرني بيك.`,
    `بحب طريقة كلامك، وطريقة إنك بتفهم من نظرة، وحتى الوقت اللي بتسكت فيه.`,
    `لو رجع بيا الزمن، هختارك تاني من غير أي تفكير.`,
  ];

  const long = [
    ...medium,
    ``,
    `يمكن أنا مش بقول كلام زي ده كتير، وممكن يبان إني مشغول، بس الحقيقة إنك دايماً في دماغي.`,
    `كل مرة بضحك من قلبى بتكون انت السبب، وكل مرة بحتاج حد بتلاقيك جنبي من غير ما أطلب.`,
    `الناس بتدور كتير على حد يفهمها — وأنا لقيتك.`,
    ``,
    `خليني أوعدك بحاجة: هفضل أحاول أكون أحسن عشانك، وأكون الشخص اللي تستاهليه.`,
    `وهفضل أقولك كل يوم إني بحبك، لحد ما تتأكد إن الكلام ده مش مجاملة — ده حقيقة.`,
  ];

  const lines = length === 'short' ? short : length === 'long' ? long : medium;

  return JSON.stringify({
    message: lines.join('\n'),
    tone_note: `النبرة: ${tone}`,
    variants: [
      lines.join('\n'),
      `${recipient}، من غير مقدمات: انت أغلى حد عندي، وده مش هيتغير.`,
    ],
  });
}

function experience(meta: Record<string, string>): string {
  const recipient = meta.recipient || 'صاحبك';
  const occasion = meta.occasion || 'مناسبة خاصة';

  return JSON.stringify({
    title: `حاجة مخصوصة لـ ${recipient}`,
    intro: `مقررت أعمل حاجة مختلفة السنة دي — مش هدية تتلف، حاجة تفضل معاك. جاهز؟`,
    sections: [
      {
        type: 'story',
        title: 'أول لقاء',
        content: `مش هنسى أول مرة اتكلمنا فيها. كانت عادية في ظاهرها، بس أنا خرجت منها وإحساسي مختلف. من يومها عرفت إن ${recipient} شخص مش عادي.`,
      },
      {
        type: 'memory',
        title: 'موقف مش هنساه',
        content: `فاكر يوم ${occasion}؟ الضحك اللي مكناش بنقدر نوقف، والكلام اللي قلناه واحنا بنمشي. التفاصيل الصغيرة دي هي اللي بتفضل.`,
      },
      {
        type: 'memory',
        title: 'حاجة بتفكرني بيك',
        content: `كل مرة أعدي على المكان ده بفتكرك. مهما عدى الوقت، الحاجات دي بتفضل بتتكلم عنك.`,
      },
      {
        type: 'message',
        title: 'كلمة من قلبي',
        content: `يمكن مش بقول الكلام ده كتير، بس انت من الناس اللي بتغير يومي للأحسن. شكراً إنك موجود.`,
      },
      {
        type: 'final',
        title: 'المفاجأة',
        content: 'وآخر حاجة… بجد أنا محظوظ بيك. كل سنة وانت طيب.',
      },
    ],
    final_message: `كل سنة وانت طيب يا ${recipient}. النهارده يومك، وأنا سعيد إني حبيت أعمل حاجة تخصك.`,
  });
}

function story(meta: Record<string, string>): string {
  const recipient = meta.recipient || 'البطل';

  return JSON.stringify({
    title: `حكاية ${recipient}`,
    paragraphs: [
      `${recipient} دخل حياتي من غير سابق إنذار، والدنيا اتغيرت.`,
      `الحكاية بدأت بتفصيلة صغيرة، بس التفصيلة دي فتحت باب لحاجة كبيرة.`,
      `أيام كتير عدّت، فيها ضحك وفيها تعب، وفي كل مرة كان فيه حد جنبي.`,
      `وأنا واقف هنا دلوقتي، بحكي الحكاية وأنا ممتن إنها حصلت.`,
    ],
    closing: 'الحكايات مبتحكيش كل حاجة، فيه حاجات بتفضل بين السطور. وده أجمل جزء.',
  });
}

function vibe(meta: Record<string, string>): string {
  return JSON.stringify({
    palette: ['#00D6A3', '#8B5CF6', '#FF4D8D'],
    mood: meta.tone || 'دافئ',
    animation: 'soft-float',
  });
}

export function mockProvider(options: GenerateOptions): string {
  const meta = readMeta(options.messages);

  switch (options.feature) {
    case 'gift_suggestions':
      return suggestions(meta);
    case 'message':
      return message(meta);
    case 'gift_experience':
      return experience(meta);
    case 'story':
      return story(meta);
    case 'vibe':
      return vibe(meta);
    default:
      return suggestions(meta);
  }
}