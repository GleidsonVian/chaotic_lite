// Banco de Times Sugeridos — Chaotic Lite
// mode: '6v6' | '3v3' — filtra por modo de jogo

const teamsDatabase = [
    // ── 1v1 — DUELOS ─────────────────────────────────────────────────────────

    { id:"1v1-t1", mode:"1v1", name:"O Conquistador", tribe:"UnderWorld", style:"Poder Bruto", emoji:"👑",
      description:"Lord Van Bloot sozinho — stats absurdos, Poder 115 e habilidade de drenar vida do inimigo se Coragem < 65.",
      color:"#dc2626", creatures:["Lord Van Bloot"],
      strengths:["Poder 115 — maior do jogo","Drena energia se inimigo fraco","Alta velocidade"],
      weaknesses:["Sem aliados para sinergia","Depende do battlegear"] },

    { id:"1v1-t2", mode:"1v1", name:"O Lendário", tribe:"UnderWorld", style:"Agressivo", emoji:"🔥",
      description:"Chaor 1v1: Coragem 95, Poder 90 e habilidade de negar mugics OverWorld. O melhor duelo do jogo.",
      color:"#dc2626", creatures:["Chaor"],
      strengths:["Nega mugics inimigas","Fire element","Alto dano com 3 mugic counters"],
      weaknesses:["Vida apenas 70","Vulnerável a ataques rápidos"] },

    { id:"1v1-t3", mode:"1v1", name:"O Herói", tribe:"OverWorld", style:"Tanque / Cura", emoji:"🛡️",
      description:"Maxxor 1v1: vida máxima, Coragem altíssima e cura ativa via mugic counter.",
      color:"#0ea5e9", creatures:["Maxxor"],
      strengths:["Vida 100","Cura ativa","Fire + Earth elementos"],
      weaknesses:["Velocidade média","Sem efeito passivo direto"] },

    { id:"1v1-t4", mode:"1v1", name:"O Fantasma", tribe:"Mipedian", style:"Strike / Invisível", emoji:"👻",
      description:"Prince Mudeenu 1v1: Invisibilidade + Strike 20 — garante o primeiro strike SEMPRE com +20 de dano.",
      color:"#d97706", creatures:["Prince Mudeenu"],
      strengths:["Strike 20 garantido","Invisibilidade","Único da sua classe"],
      weaknesses:["Vida apenas 45","Stats medianos sem aliados"] },

    { id:"1v1-t5", mode:"1v1", name:"O Sábio", tribe:"OverWorld", style:"Controle / Mugic", emoji:"🎶",
      description:"Najarin 1v1: Sabedoria 90 e habilidade de recuperar Mugics do descarte.",
      color:"#8b5cf6", creatures:["Najarin"],
      strengths:["Wisdom 90","Recupera mugics","Único e estratégico"],
      weaknesses:["Vida baixa 30","Fisicamente fraco"] },

    { id:"1v1-t6", mode:"1v1", name:"A Rainha", tribe:"Danian", style:"Hive / Tanque", emoji:"🐜",
      description:"Illexia 1v1: alta vida, Tough 5 e Water+Earth. A criatura mais resistente dos Danians.",
      color:"#9333ea", creatures:["Illexia"],
      strengths:["Tough 5 reduz todo dano","Vida 70","Water + Earth elementos"],
      weaknesses:["Sem aliados para Hive","Velocidade baixa"] },

    { id:"1v1-t7", mode:"1v1", name:"O Velocista", tribe:"Mipedian", style:"Velocidade", emoji:"⚡",
      description:"Qwun 1v1: Velocidade 90, sempre ataca primeiro. Invisibility + Surprise para surpreender.",
      color:"#3b82f6", creatures:["Qwun"],
      strengths:["Velocidade 90 — sempre ataca primeiro","Invisibility Surprise","Air element"],
      weaknesses:["Vida apenas 35 — extremamente frágil","Dano médio"] },

    { id:"1v1-t8", mode:"1v1", name:"A Muralha", tribe:"UnderWorld", style:"Tanque Extremo", emoji:"🏰",
      description:"Xield 1v1: 95 de Coragem e habilidade de sacrificar vida própria para curar aliados (ou si mesmo).",
      color:"#dc2626", creatures:["Xield"],
      strengths:["Coragem 95","Ativa a própria habilidade de cura","Extremamente durável"],
      weaknesses:["Vida apenas 20","Precisa se auto-machucar para usar habilidade"] },

    // ── 3v3 ──────────────────────────────────────────────────────────────────

    {
        id: "3v3-t1", mode: "3v3",
        name: "Trio Furioso UnderWorld",
        tribe: "UnderWorld", style: "Agressivo", emoji: "🔥",
        description: "3 criaturas UnderWorld de alto Poder. Combates rápidos e letais — normalmente acaba em 2-3 rounds.",
        color: "#dc2626",
        creatures: ["Chaor", "Lord Van Bloot", "Rothar"],
        strengths: ["Devastador no 1º ataque", "Intimidate reduz stats", "Muito alto Poder"],
        weaknesses: ["Sem recuperação", "Frágil se perder iniciativa"]
    },
    {
        id: "3v3-t2", mode: "3v3",
        name: "Trindade OverWorld",
        tribe: "OverWorld", style: "Equilíbrado", emoji: "🛡️",
        description: "3 heróis OverWorld: tanque, curador e striker. Time completo para 3v3.",
        color: "#0ea5e9",
        creatures: ["Maxxor", "Intress", "Najarin"],
        strengths: ["Cura garantida", "Alta sobrevivência", "Mugics de controle"],
        weaknesses: ["Velocidade média", "Sem surpresa"]
    },
    {
        id: "3v3-t3", mode: "3v3",
        name: "Sombras Mipedianas",
        tribe: "Mipedian", style: "Strike / Furtivo", emoji: "👻",
        description: "3 Mipedianos invisíveis com Strike alto. Primer strike sempre com bônus.",
        color: "#d97706",
        creatures: ["Prince Mudeenu", "Marquis Darini", "Zhade"],
        strengths: ["Strike em todos", "Invisibilidade", "Velocidade alta"],
        weaknesses: ["Vida baixa", "Frágil após revelar"]
    },
    {
        id: "3v3-t4", mode: "3v3",
        name: "Núcleo da Colmeia",
        tribe: "Danian", style: "Hive", emoji: "🐜",
        description: "3 Danians que ativam Hive imediatamente — com 2 aliados o bônus é máximo para 3v3.",
        color: "#9333ea",
        creatures: ["Lore", "Illexia", "Ekuud"],
        strengths: ["Hive ativo com 2 aliados", "Alta sabedoria", "Mugics de dano + cura"],
        weaknesses: ["Começa fraco", "Depende da ordem de combate"]
    },
    {
        id: "3v3-t5", mode: "3v3",
        name: "Velocidade Extrema",
        tribe: "Misto", style: "Swift / Range", emoji: "⚡",
        description: "3 criaturas com Swift e Range — sempre ataca primeiro e pode escolher qualquer alvo.",
        color: "#3b82f6",
        creatures: ["Intress", "Dractyl", "Kerric"],
        strengths: ["Sempre ataca primeiro", "Range total", "Difícil de alcançar"],
        weaknesses: ["Dano médio", "Sem cura"]
    },
    {
        id: "3v3-t6", mode: "3v3",
        name: "Poder Bruto",
        tribe: "Misto", style: "Puro Poder", emoji: "💪",
        description: "Os 3 maiores Poderes do jogo. 1 ataque bem colocado elimina qualquer criatura.",
        color: "#f59e0b",
        creatures: ["Lord Van Bloot", "Grook", "Klasp"],
        strengths: ["Poder absurdo", "Intimidate: Power", "Elimina em 1-2 golpes"],
        weaknesses: ["Sem cura", "Wisdom baixa"]
    },
    {
        id: "3v3-t7", mode: "3v3",
        name: "Controle Mágico",
        tribe: "Misto", style: "Mugic / Controle", emoji: "🎶",
        description: "3 conjuradores com alta Sabedoria e múltiplos counters. Dominam o burst completamente.",
        color: "#8b5cf6",
        creatures: ["Najarin", "Heptadd", "Lore"],
        strengths: ["Todos têm 2+ mugic counters", "Heptadd usa qualquer mugic", "Controle total do burst"],
        weaknesses: ["Dano físico baixo", "Lento"]
    },
    {
        id: "3v3-t8", mode: "3v3",
        name: "Risco Calculado",
        tribe: "Misto", style: "Reckless / Sacrifício", emoji: "💥",
        description: "Criaturas que se ferem para causar dano massivo. Sacrifica Klasp para dano garantido.",
        color: "#ef4444",
        creatures: ["Klasp", "Rothar", "Magmon"],
        strengths: ["Dano altíssimo", "Sacrifício tático", "Fire + Earth elementos"],
        weaknesses: ["Auto-dano", "Sem recuperação"]
    },

    // ── 6v6 ──────────────────────────────────────────────────────────────────
    // ── TRIBAIS PUROS ────────────────────────────────────────────────────────

    {
        id: "t1", mode: "6v6",
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
        id: "t2", mode: "6v6",
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
        id: "t3", mode: "6v6",
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
        id: "t4", mode: "6v6",
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
        id: "t5", mode: "6v6",
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
        id: "t6", mode: "6v6",
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
        id: "t7", mode: "6v6",
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
        id: "t8", mode: "6v6",
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
        id: "t9", mode: "6v6",
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
        id: "t10", mode: "6v6",
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
        id: "t11", mode: "6v6",
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
        id: "t12", mode: "6v6",
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
        id: "t13", mode: "6v6",
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
        id: "t14", mode: "6v6",
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
        id: "t15", mode: "6v6",
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
        id: "t16", mode: "6v6",
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
        id: "t17", mode: "6v6",
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
        id: "t18", mode: "6v6",
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

