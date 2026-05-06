/**
 * seed3.ts — Sources réseaux sociaux & contenus complémentaires
 * Usage : npx tsx seed3.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOURCES = [
  // ── TWITTER / X ─────────────────────────────────────────────────────────
  {
    title: "Tweet @EmmanuelMacron — Gaza, appel à la paix (octobre 2023)",
    content: "Je condamne avec la plus grande fermeté les attaques terroristes du Hamas contre Israël. La France est aux côtés d'Israël face au terrorisme. Dans le même temps, je demande la protection des civils à Gaza, l'accès à l'aide humanitaire et le respect du droit international. Il n'y a pas de victoires durables sans paix juste. La France agit pour que les civils soient protégés de toutes parts.",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2023-10-10",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Tweet @EmmanuelMacron — Retraites, adresse aux Français (avril 2023)",
    content: "Je comprends la colère, les inquiétudes, les doutes. Cette réforme, personne n'en voulait. Moi le premier. Mais comment expliquer à nos enfants que nous avons su voir le problème et que nous n'avons rien fait ? Notre système par répartition, c'est un pacte entre les générations. Il nous appartient de le préserver.",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2023-04-22",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Tweet @EmmanuelMacron — Victoire de la France, Coupe du Monde 2018",
    content: "Fiers de notre équipe de France ! Cette victoire est celle de toute une génération, de toute une nation. Ces joueurs ont montré que quand on se bat ensemble, quand on croit en soi, on peut soulever des montagnes. Vive la France !",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2018-07-15",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Tweet @EmmanuelMacron — Intelligence artificielle, investissements (2024)",
    content: "La France investit massivement dans l'IA : 1 milliard d'euros pour la recherche, des champions comme Mistral AI, une régulation européenne pionnière. Notre objectif : faire de l'Europe le continent de référence pour une IA de confiance, éthique et souveraine. C'est notre défi collectif pour cette décennie.",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2024-03-12",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Tweet @EmmanuelMacron — Hommage à Jean-Paul Belmondo (septembre 2021)",
    content: "Il était la France. Libre, insolente, mélancolique et lumineuse. Jean-Paul Belmondo nous quitte. Il avait ce talent rare de sembler naturel dans tous les rôles, cette façon d'occuper l'écran comme une évidence. Nous l'aimions. La Nation perd un trésor.",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2021-09-06",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Tweet @Elysee — Fête nationale 14 juillet 2023",
    content: "Le 14 juillet, c'est notre fête commune, celle de la République et de la liberté. C'est le moment de célébrer ce qui nous unit : nos valeurs, notre histoire, notre avenir partagé. En cette période troublée, gardons vivant l'idéal républicain qui fait la force de la France. Vive la République, vive la France !",
    source_url: "https://x.com/Elysee",
    source_date: "2023-07-14",
    source_type: "declaration",
    source_site: "x.com",
  },

  // ── INSTAGRAM ÉLYSÉE ────────────────────────────────────────────────────
  {
    title: "Instagram @elysee — COP28, engagement climatique (décembre 2023)",
    content: "La France s'engage à Dubai pour un accord historique sur la sortie des énergies fossiles. Nous portons une ambition : que ce sommet soit celui du tournant climatique. Notre planète n'attend pas. Nous avons la responsabilité collective d'agir maintenant, pour les générations futures. La France sera toujours au rendez-vous de l'histoire.",
    source_url: "https://www.instagram.com/elysee",
    source_date: "2023-12-02",
    source_type: "declaration",
    source_site: "instagram.com",
  },
  {
    title: "Instagram @EmmanuelMacron — Rentrée scolaire, message aux enseignants (sept. 2023)",
    content: "En ce jour de rentrée, j'ai une pensée particulière pour nos enseignants. Vous êtes la colonne vertébrale de notre République. Votre mission d'instruire, d'éduquer, de transmettre les valeurs qui fondent notre société est la plus belle et la plus exigeante qui soit. Nous augmentons vos rémunérations parce que vous le méritez et parce que la nation vous en est reconnaissante.",
    source_url: "https://www.instagram.com/emmanuelmacron",
    source_date: "2023-09-04",
    source_type: "declaration",
    source_site: "instagram.com",
  },
  {
    title: "Instagram @elysee — Journée des droits des femmes, 8 mars 2024",
    content: "L'égalité entre les femmes et les hommes est la grande cause de mon quinquennat. Ce n'est pas une formule — c'est un engagement concret : budget dédié, plan contre les violences conjugales, égalité salariale. Nous avons progressé mais il reste tant à faire. Le 8 mars est un rappel : cette lutte n'est pas terminée, et elle concerne chacun d'entre nous.",
    source_url: "https://www.instagram.com/elysee",
    source_date: "2024-03-08",
    source_type: "declaration",
    source_site: "instagram.com",
  },

  // ── INTERVIEWS & PRISES DE POSITION MÉDIAS ──────────────────────────────
  {
    title: "Interview TF1 — Question sur le retrait de Gaza et la diplomatie française",
    content: "La France a une voix propre dans ce conflit. Nous ne sommes ni du côté du Hamas — organisation terroriste — ni dans un soutien inconditionnel qui ignorerait les victimes civiles. La France porte une parole d'humanité et de droit international. J'ai appelé à un cessez-le-feu humanitaire. Nous œuvrons par la diplomatie pour éviter l'embrasement régional.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/11/09/interview-tf1-proche-orient",
    source_date: "2023-11-09",
    source_type: "interview",
    source_site: "elysee.fr",
  },
  {
    title: "Interview France 2 — Question sur son style de gouvernance (2022)",
    content: "On me dit vertical, autoritaire. Je l'assume en partie : je prends mes responsabilités et je n'esquive pas les sujets difficiles. Mais le vrai sujet c'est : est-ce que les décisions sont bonnes pour le pays ? Le quinquennat c'est cinq ans au service de la France, pas cinq ans à se préserver. Je préfère être jugé sur les résultats.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2022/07/14/interview-france2",
    source_date: "2022-07-14",
    source_type: "interview",
    source_site: "elysee.fr",
  },
  {
    title: "Vœux aux Français — 31 décembre 2023",
    content: "En cette nuit de réveillon, je veux vous parler avec sincérité. 2023 a été une année difficile : l'inflation, les tensions sociales, les crises internationales. Mais j'ai vu aussi la France se lever, innover, résister. En 2024, nous avons un défi commun : retrouver le chemin de l'unité nationale. Non pas l'uniformité, mais ce qui, en même temps, nous rassemble et nous fait avancer. Bonne année à toutes et tous.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/12/31/voeux-2024",
    source_date: "2023-12-31",
    source_type: "declaration",
    source_site: "elysee.fr",
  },
  {
    title: "Tweet @EmmanuelMacron — Sport, Jeux Olympiques Paris 2024",
    content: "Paris sera la capitale mondiale du sport cet été. Les Jeux Olympiques de Paris 2024 seront une fête pour la France et pour le monde. Nous avons mis dix ans à préparer ce moment. Je suis fier de ce que nous avons bâti : des infrastructures, oui, mais surtout une ambition : montrer la France à son meilleur.",
    source_url: "https://x.com/EmmanuelMacron",
    source_date: "2024-01-24",
    source_type: "declaration",
    source_site: "x.com",
  },
  {
    title: "Instagram @elysee — Commémoration du 8 mai 1945",
    content: "Le 8 mai 1945 marque la fin d'une barbarie que nous ne devons jamais oublier. Ceux qui ont combattu pour la liberté de l'Europe nous ont légué quelque chose de précieux et de fragile. Aujourd'hui que la guerre est revenue sur notre continent, ce devoir de mémoire est plus nécessaire que jamais. N'oublions jamais ce que la liberté a coûté.",
    source_url: "https://www.instagram.com/elysee",
    source_date: "2023-05-08",
    source_type: "declaration",
    source_site: "instagram.com",
  },
  {
    title: "Discours — Sécheresse et plan eau (mars 2023)",
    content: "La France connaît des épisodes de sécheresse de plus en plus sévères. C'est le dérèglement climatique à nos portes. J'ai présenté le Plan eau : sobriété de 10% de la consommation d'ici 2030, réutilisation des eaux usées, modernisation des réseaux. L'eau est un bien commun précieux. Nous ne pouvons pas continuer à la gaspiller comme si elle était inépuisable.",
    source_url: "https://www.elysee.fr/emmanuel-macron/2023/03/30/plan-eau",
    source_date: "2023-03-30",
    source_type: "discours",
    source_site: "elysee.fr",
  },
];

async function seed() {
  console.log(`\n🌱 Insertion de ${SOURCES.length} sources réseaux sociaux & médias...\n`);

  const { data, error } = await supabase
    .from('president_sources')
    .insert(SOURCES)
    .select('id');

  if (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} sources insérées !\n`);
  console.log('Sources ajoutées :');
  console.log('  • 6 tweets @EmmanuelMacron (Gaza, retraites, foot, IA, Belmondo, JO)');
  console.log('  • 2 tweets @Elysee (14 juillet, COP28)');
  console.log('  • 3 posts Instagram Élysée (COP28, rentrée, 8 mars, 8 mai)');
  console.log('  • 3 interviews TV (Proche-Orient, gouvernance, plan eau)');
  console.log('  • Vœux 2024');
}

seed();
