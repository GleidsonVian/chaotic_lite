// Banco de Times Sugeridos — Chaotic Lite
// Cada time tem 6 criaturas com boa sinergia entre si

const teamsDatabase = [
    // ── TRIBAIS PUROS ────────────────────────────────────────────────────────

    {
        id: "t1",
        name: "Tempestade UnderWorld",
        tribe: "UnderWorld",
        style: "Agressivo",
        emoji: "🔥",
        description: "Alta Coragem e Poder, ataca primeiro e causa dano brutal. Intimidate em cadeia reduz os stats do inimigo antes do combate.",
        color: "#dc2626",
        creatures: ["Chaor", "Lord Van Bloot", "Rothar", "Klasp", "Kughar", "Grook"],
        strengths: ["Alto dano", "Intimidate em cadeia", "Iniciativa dominante"],
        weaknesses: ["Baixa defesa", "Pouca cura"]
    },
    {
        id: "t2",
        name: "Muralha OverWorld",
        tribe: "OverWorld",
        style: "Defensivo / Suporte",
        emoji: "🛡️",
        description: "Criaturas com alta vida e suporte mútuo. Support: bônus passivos para aliados adjacentes e mugics de cura.",
        color: "#0ea5e9",
        creatures: ["Maxxor", "Intress", "Heptadd", "Rellim", "Donmar", "Frafdo"],
        strengths: ["Alta sobrevivência", "Cura constante", "Sinergia Heptadd + Mugics"],
        weaknesses: ["Dano médio", "Lento para matar"]
    },
    {
        id: "t3",
        name: "Fantasmas do Deserto",
        tribe: "Mipedian",
        style: "Furtivo / Strike",
        emoji: "👻",
        description: "Invisibilidade + Strike: ataca de surpresa causando bônus de dano no primeiro strike. Extremamente difícil de mirar.",
        color: "#d97706",
        creatures: ["Prince Mudeenu", "Marquis Darini", "Vinta", "Malvadine", "Brathe", "Siado"],
        strengths: ["Invisibilidade universal", "Strike bônus garantido", "Alta velocidade"],
        weaknesses: ["Vida baixa", "Frágil se revelado"]
    },
    {
        id: "t4",
        name: "Colmeia Danian",
        tribe: "Danian",
        style: "Crescimento / Hive",
        emoji: "🐜",
        description: "Hive: quanto mais Mandiblors em campo, mais fortes ficam todos. Começa fraco mas se torna devastador no final.",
        color: "#9333ea",
        creatures: ["Lore", "Ekuud", "Kebna", "Galin", "Ibiaan", "Mallash"],
        strengths: ["Cresce durante a batalha", "Stats altíssimos no fim", "Hive ativa em cadeia"],
        weaknesses: ["Fraco no início", "Vulnerável a board wipe"]
    },
    {
        id: "t5",
        name: "Guerreiros Mipedianos",
        tribe: "Mipedian",
        style: "Strike / Velocidade",
        emoji: "🌪️",
        description: "Os melhores guerreiros Mipedianos combinam Strike alto, velocidade extrema e invisibilidade para dominar a iniciativa.",
        color: "#f59e0b",
        creatures: ["Prince Mudeenu", "Zhade", "Ario", "Biondu", "Ubliqun", "Qwun"],
        strengths: ["Strike em todo o time", "Velocidade altíssima", "Invisibilidade tática"],
        weaknesses: ["Baixo poder bruto", "Sem cura"]
    },
    {
        id: "t6",
        name: "Nobre Colmeia",
        tribe: "Danian",
        style: "Hive / Noble",
        emoji: "👑",
        description: "Nobles Danians com Hive que escalam por Power. Valanii Levaan cresce absurdamente, Kannen ressuscita Mandiblors.",
        color: "#9333ea",
        creatures: ["Illexia", "Valanii Levaan", "Lore", "Kannen", "Junda", "Skartalas"],
        strengths: ["Valanii Levaan escala +10 Power por Mandiblor", "Ressurreição Kannen", "Controle via Hive"],
        weaknesses: ["Lento", "Frágil individualmente"]
    },
    {
        id: "t7",
        name: "Comandantes das Sombras",
        tribe: "UnderWorld",
        style: "Controle / Intimidate",
        emoji: "😈",
        description: "Comandantes UnderWorld com Intimidate duplo que enfraquece stats de Coragem E Sabedoria ao mesmo tempo.",
        color: "#dc2626",
        creatures: ["Pyrithion", "Borth-Majar", "Khybon", "Drakness", "Skithia", "H'earring"],
        strengths: ["Intimidate duplo na maioria", "Drakness amplifica mugics", "Controle de Location Deck"],
        weaknesses: ["Dano físico médio", "Dependente de combinações"]
    },
    {
        id: "t8",
        name: "Guardiões OverWorld",
        tribe: "OverWorld",
        style: "Tanque / Suporte",
        emoji: "🏰",
        description: "Guardiões com alta Coragem, Support passivo e vida robusta. O time que aguenta mais dano de Dawn of Perim.",
        color: "#0ea5e9",
        creatures: ["Maxxor", "Maglax", "Zalic", "Owis", "Slurhk", "Velreth"],
        strengths: ["Vida altíssima", "Support em cadeia", "Earth + Water bônus"],
        weaknesses: ["Velocidade baixa", "Perde iniciativa frequentemente"]
    },

    // ── MISTOS / TEMÁTICOS ───────────────────────────────────────────────────

    {
        id: "t9",
        name: "Esquadrão Veloz",
        tribe: "Misto",
        style: "Velocidade / Iniciativa",
        emoji: "⚡",
        description: "Time focado em Velocidade e Swift: sempre ataca primeiro, garante Strike no primeiro turno e determina a iniciativa.",
        color: "#3b82f6",
        creatures: ["Intress", "Takinom", "Gespedan", "Dractyl", "Kerric", "Qwun"],
        strengths: ["Sempre ataca primeiro", "Range para atacar protegidos", "Difícil de alcançar"],
        weaknesses: ["Dano mediocre", "Frágil contra Intimidate"]
    },
    {
        id: "t10",
        name: "Máquinas de Guerra",
        tribe: "Misto",
        style: "Puro Poder",
        emoji: "💪",
        description: "As criaturas com mais Poder de Dawn of Perim. Ataques físicos brutais que passam qualquer Challenge de Poder.",
        color: "#f59e0b",
        creatures: ["Lord Van Bloot", "Grook", "Rothar", "Klasp", "Borth-Majar", "Kughar"],
        strengths: ["Dano físico absurdo", "Passa Challenges facilmente", "Intimidate: Power"],
        weaknesses: ["Baixa Sabedoria", "Ataques mágicos ruins"]
    },
    {
        id: "t11",
        name: "Mestres da Magia",
        tribe: "Misto",
        style: "Mugic / Controle",
        emoji: "🎶",
        description: "Alta Sabedoria e muitos Mugic Counters. Controla o burst com Mugics poderosas e neutraliza ameaças com sacrifícios.",
        color: "#8b5cf6",
        creatures: ["Najarin", "Heptadd", "Lore", "Sobtjek", "Tiaane", "Tartarek"],
        strengths: ["Mugics poderosas", "Controle de burst", "Sacrifícios táticos"],
        weaknesses: ["Baixo dano físico", "Depende de Mugic Counters"]
    },
    {
        id: "t12",
        name: "Elementalistas",
        tribe: "Misto",
        style: "Elemental",
        emoji: "🌊",
        description: "Cobre todos os 4 elementos — Fire, Water, Earth e Air — ativando bônus elementais com qualquer ataque da mão.",
        color: "#10b981",
        creatures: ["Maxxor", "Chaor", "Crawsectus", "Blügon", "Heptadd", "Skithia"],
        strengths: ["Bônus elemental garantido", "Cobertura de todos os elementos", "Versátil"],
        weaknesses: ["Sinergia tribal fraca", "Médio em tudo"]
    },
    {
        id: "t13",
        name: "Sniper + Suporte",
        tribe: "Misto",
        style: "Range / Posicionamento",
        emoji: "🎯",
        description: "Criaturas com Range atacam alvos protegidos sem precisar eliminar a linha de frente. Liberdade de alvo total.",
        color: "#e67e22",
        creatures: ["Dractyl", "Ghuul", "Skreeth", "Krekk", "Rarran", "Kerric"],
        strengths: ["Ataca qualquer alvo do tabuleiro", "Swift para atacar primeiro", "Fire element bônus"],
        weaknesses: ["Vida baixa em média", "Sem cura"]
    },
    {
        id: "t14",
        name: "Blitz Imprudente",
        tribe: "Misto",
        style: "Reckless / Alto Risco",
        emoji: "💢",
        description: "Criaturas Reckless causam dano brutal mas também se ferem. Time de alto risco — mata antes de morrer ou perde.",
        color: "#ef4444",
        creatures: ["Klasp", "Rothar", "Toxis", "Magmon", "Barath Beyond", "Nauthilax"],
        strengths: ["Dano altíssimo", "Fire + Water elementos", "Pressão constante"],
        weaknesses: ["Se fere em todo ataque", "Sem recuperação possível"]
    },
    {
        id: "t15",
        name: "Sabedoria Suprema",
        tribe: "Misto",
        style: "Sabedoria / Mágico",
        emoji: "🧠",
        description: "Sabedoria acima de 70 em todo o time — passa qualquer Challenge de Wisdom e derrota criaturas com ataques mágicos.",
        color: "#6366f1",
        creatures: ["Najarin", "Attacat", "Illexia", "Khybon", "Ibiaan", "Xield"],
        strengths: ["Challenges de Wisdom sempre passam", "Ataques mágicos devastadores", "Alta vida em média"],
        weaknesses: ["Velocidade baixa", "Vulnerável a Intimidate: Wisdom"]
    },
    {
        id: "t16",
        name: "Fogo e Destruição",
        tribe: "Misto",
        style: "Elemental Fire",
        emoji: "🌋",
        description: "Todo o time tem o elemento Fire — bônus elemental garantido em todos os ataques de fogo da mão de ataques.",
        color: "#dc2626",
        creatures: ["Chaor", "Barath Beyond", "Magmon", "Skithia", "Krekk", "Dardemus"],
        strengths: ["Fire 5 em quase todos", "Intimidate em vários", "Dano elemental consistente"],
        weaknesses: ["Vulnerável a Fireproof", "Sem diversidade elemental"]
    },
    {
        id: "t17",
        name: "Estrategistas OverWorld",
        tribe: "OverWorld",
        style: "Estratégia / Suporte",
        emoji: "📜",
        description: "Estrategistas e Caretakers que constroem vantagem paulatinamente: curam, bootstam aliados e controlam o Location Deck.",
        color: "#0ea5e9",
        creatures: ["Najarin", "Tangath Toborn", "Psimion", "Blazier", "Vidav", "Bodal"],
        strengths: ["Support em múltiplos stats", "Controle de Location", "Mugics de cura acessíveis"],
        weaknesses: ["Dano baixo individualmente", "Precisa de mugics para brilhar"]
    },
    {
        id: "t18",
        name: "Terror Invisível",
        tribe: "Misto",
        style: "Invisibilidade / Surprise",
        emoji: "🕶️",
        description: "Criaturas de múltiplas tribos com Invisibilidade: Surprise garante que o inimigo nunca sabe quem vai atacar.",
        color: "#8b5cf6",
        creatures: ["Prince Mudeenu", "Zhade", "Siado", "Uro", "H'earring", "Qwun"],
        strengths: ["Invisibilidade em todo o time", "Surprise nunca falha", "Extremamente difícil de prever"],
        weaknesses: ["Stats medianos", "Frágil se forçado a defender"]
    }
];

window.teamsDatabase = teamsDatabase;
