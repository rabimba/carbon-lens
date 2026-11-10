/* ==========================================================================
   ENGLISH 135: INTERACTIVE SEMINAR MECHANICS
   Blackboard Taxonomies • 9 Playable Victrola Operas • Humane Assignments • Exam
   ========================================================================== */

window.AUDEN_BLACKBOARD = {
  smuggledNotes: [
    {
      date: "Sept. 29, 1941 — Angell Hall, Room 2225",
      author: "Smuggled back-row note (Kenneth Millar / 'Ross Macdonald')",
      entry: "Auden shuffled in ten minutes after the bell wearing a faded jersey, baggy trousers, and worn sneakers, smoking a Lucky Strike down to his knuckles. Wrote 'W. H. AUDEN' tiny in the corner of the slate, turned around, and announced: 'No note-taking, please.' Then handed out a single purple mimeographed sheet listing 6,000 pages for two credits."
    },
    {
      date: "Oct. 21, 1941 — After the Augustine & Dante Lecture",
      author: "Smuggled note in the Michigan Union",
      entry: "He draws boxes and arrows over the whole board until his sleeves are white with chalk dust. Today: why Greeks couldn't write Augustine's Confessions. 'To a Greek, if you know the good and don't do it, your arithmetic was faulty. To Augustine, you know it's a sour pear and steal it anyway because you want to play God with your pals.'"
    },
    {
      date: "Nov. 14, 1941 — The Scandalous Othello Diagram",
      author: "Charles Miller / Millar Seminar Lore",
      entry: "Half the English majors gasped today. Auden diagrammed Othello as a vain actor in love with his own martial grandeur, and called 'honest Iago' a pure experimental scientist—a practical joker pulling wings off flies to prove nobody possesses free moral dignity."
    },
    {
      date: "Dec. 8, 1941 — Day After Pearl Harbor",
      author: "Angell Hall Winter Session",
      entry: "Campus in shock since yesterday's radio bulletins. Auden didn't cancel class; he read passages on history, force, and the Grand Inquisitor with quiet, fierce gravity. Suddenly Aeschylus, Henry Adams's Dynamo, and Wagner's burning Valhalla don't feel like 'mere literature' anymore."
    },
    {
      date: "Jan. 1942 — The Student Protest Committee",
      author: "Final Weeks Lore",
      entry: "A delegation of exhausted seniors officially protested the final examination scope as 'impossible and inhumane.' Rumor says Auden offered an alternative: recite any six cantos of Dante's Commedia (~850 lines!) from memory over tea at 1227 Pontiac Street."
    }
  ],

  boards: [
    {
      id: "necessity-possibility",
      tabTitle: "I. Necessity vs. Possibility",
      boardHeading: "THE TWO TRAGEDIES: GREEK NECESSITY vs. CHRISTIAN POSSIBILITY",
      citation: "Drawn from lectures later published as 'The Christian Tragic Hero' (1945) & The Enchafèd Flood (1950)",
      chalkSummary: "Click any row on Auden's slate chart to compare how ancient Athens and post-Augustinian Europe stage human ruin.",
      type: "comparison",
      columns: ["AXIS OF FATE", "GREEK: TRAGEDY OF NECESSITY", "CHRISTIAN / MODERN: POSSIBILITY"],
      rows: [
        {
          axis: "1. Hero's Starting Condition",
          left: "Exceptionally fortunate, royal, healthy, victorious (Agamemnon returning from Troy; Oedipus reigning in Thebes).",
          right: "Already scarred, alienated, or inwardly divided (Ahab enters missing a leg; Hamlet in mourning; Macbeth tempted).",
          audenNote: "If a Greek hero began already maimed like Captain Ahab, an Athenian audience would think the gods had already finished with him! Ahab's scar proves his doom is NOT inevitable—it is how he *answers* suffering that damns him."
        },
        {
          axis: "2. Definition of Hubris",
          left: "Illusion of invulnerability (Theios Aner): forgetting mortal limits and treading the gods' crimson carpet.",
          right: "Defiant spiritual pride (Superbia): knowing one is weak and finite, yet storming heaven out of spite ('I'd strike the sun!').",
          audenNote: "Greek hubris overestimates human power; modern demonic pride (Ahab, Iago, Ivan Karamazov) resents creatureliness itself."
        },
        {
          axis: "3. Shape of Time",
          left: "Closed cosmic cycle. Future already exists waiting at the crossroads; warnings (Cassandra, Teiresias) are always true yet useless.",
          right: "Open historical fork. Warnings (Starbuck, the ship Rachel, Good Angels) are genuine off-ramps where the hero *could* turn back.",
          audenNote: "When Cassandra prophesies Agamemnon's death, nothing can change it. When Starbuck begs Ahab to turn home to Nantucket, Ahab *has* to work hard to silence his own heart!"
        },
        {
          axis: "4. Bad-Faith Alibi",
          left: "None needed: Ate (cosmic blindness) genuinely descends upon the bloodline.",
          right: "Counterfeit fatalism: the rebel *pretends* he is fated ('I am the Fates' lieutenant!') to dodge repentance.",
          audenNote: "Watch out whenever a modern character talks like a Greek oracle! Francesca blaming 'Amor', Iago blaming his stars or guts, and Ahab blaming 'immutable decrees' are all forging excuses."
        },
        {
          axis: "5. Audience's Final Sigh",
          left: "'What a pity it HAD to be this way.'",
          right: "'What a pity it was this way when it MIGHT HAVE BEEN OTHERWISE.'",
          audenNote: "That single shift in verb mood—from 'had to be' to 'might have been otherwise'—is the entire journey from Sophocles to Shakespeare, Dostoevsky, and Melville."
        }
      ]
    },
    {
      id: "kierkegaard-spheres",
      tabTitle: "II. Kierkegaard's Spheres",
      boardHeading: "THE THREE EXISTENTIAL SPHERES (+ THEIR DEMONIC SHADOW)",
      citation: "Grounded in Fear and Trembling & Auden's The Living Thoughts of Kierkegaard (1952)",
      chalkSummary: "Auden mapped nearly every character and opera on the 1941 syllabus onto Kierkegaard's existential taxonomy. Inspect each sphere below.",
      type: "spheres",
      nodes: [
        {
          id: "aesthetic",
          title: "1. THE AESTHETIC SPHERE",
          subtitle: "Immediacy • Desire • 'The Interesting vs. The Boring'",
          color: "#f2c97d",
          motto: "\"Enjoy the moment; keep every possibility open; never bind yourself!\"",
          exemplars: "Mozart's Don Giovanni • Ibsen's Peer Gynt • Wagner's Tristan & Isolde • Jonson's Volpone • Early Rimbaud",
          trap: "Because it depends on youth, luck, mood, or genius, time inevitably turns pleasure into Spleen (Baudelaire) or an onion with no core (Peer Gynt).",
          audenInsight: "In the Aesthetic world, people are divided into the Lucky/Gifted and the Dull. Opera loves this sphere because music *is* pure present-tense vitality—until the Stone Guest knocks!"
        },
        {
          id: "ethical",
          title: "2. THE ETHICAL SPHERE",
          subtitle: "Vow • Universal Law • Fidelity Across Time",
          color: "#8fd3c7",
          motto: "\"Become an accountable self by keeping promises when the mood fades.\"",
          exemplars: "Beethoven's Leonore (Fidelio) • Mozart's Tamino & Pamina • Horace's Stoic Citizen • Starbuck (Moby-Dick)",
          trap: "Can harden into joyless Phariseeism (Prince Hal's cold statecraft, Creon's rigid decree, Germont's bourgeois respectability)—and breaks when confronted by one's own divided will.",
          audenInsight: "Why did Auden pair Fidelio against Tristan? Because Leonore rescuing her husband from prison proves married promise is infinitely braver than a magic love-potion!"
        },
        {
          id: "religious",
          title: "3. THE RELIGIOUS SPHERE",
          subtitle: "Repentance • Grace • Vocation & Agape",
          color: "#b8c7ff",
          motto: "\"Before God we are always in the wrong—and therefore finally free to love our neighbor.\"",
          exemplars: "St. Augustine • Dante in Paradiso • Kierkegaard's Abraham • Alyosha & Zosima • Eliot's Harry • Violetta's sacrifice",
          trap: "Counterfeited whenever someone claims private holiness to escape loving messy neighbors (Rilke's Prodigal Son) or uses authority to crush freedom (the Grand Inquisitor).",
          audenInsight: "Here Fate is transfigured: like Eliot's Harry facing the Furies, accepting guilt without despair turns ancestral curse into personal Vocation."
        },
        {
          id: "demonic",
          title: "SHADOW: DEMONIC DEFIANCE",
          subtitle: "Negative Sainthood • Spite Against Being",
          color: "#f2968f",
          motto: "\"I will rather be damned on my own terms than healed on another's!\"",
          exemplars: "Captain Ahab • Shakespeare's Iago & silent Antonio • Ivan's Grand Inquisitor • Dante's Farinata",
          trap: "Total self-enclosure: the ego locks the door from the inside and calls the dark 'immutable Fate'.",
          audenInsight: "Ahab and Iago are NOT Aesthetic hedonists—they get zero pleasure from life! They are dark, inverted ascetics sacrificing everything on the altar of Pride."
        }
      ]
    },
    {
      id: "sea-and-mirror",
      tabTitle: "III. The Sea & The Mirror",
      boardHeading: "SHAKESPEARE'S TEMPEST & ROMANTIC ICONOGRAPHY OF THE SEA",
      citation: "Swarthmore / Michigan Dualisms Chart • The Sea and the Mirror (1944) • The Enchafèd Flood (1950)",
      chalkSummary: "Select each coordinate on Auden's spatial map to see how Art, Flesh, Ego, and the Ocean pull the human self.",
      type: "spatial",
      coordinates: [
        {
          pos: "NORTH POLE — PURE POSSIBILITY",
          name: "ARIEL (The Mirror of Art)",
          works: "The Tempest • Orpheus • Rimbaud's Alchemy",
          desc: "Weightless imagination, music, and formal symmetry. Ariel can stage tempests and hold up a spotless mirror so sinners see themselves—but Ariel cannot weep, bleed, or forgive.",
          audenQuote: "\"Art is not life, and cannot be / A midwife to society...\" Art shows us our choices clearly, yet never makes the choice for us."
        },
        {
          pos: "SOUTH POLE — PURE ACTUALITY",
          name: "CALIBAN (The Unruly Sea & Flesh)",
          works: "The Tempest • Papageno • Falstaff's Belly",
          desc: "Bodily appetite, mortal nature, stubborn Contingency, the messy fact that we get hungry and die. Despise Caliban out of angelic pride, and he turns savage; honor creatureliness, and he becomes Papageno!",
          audenQuote: "In Auden's tour-de-force prose chapter ('Caliban to the Audience'), Caliban speaks in ornate Henry James sentences—reminding highbrows that Spirit and Flesh are married for keeps."
        },
        {
          pos: "CENTER — THE DISENCHANTED EGO",
          name: "PROSPERO (Breaking the Staff)",
          works: "The Tempest • Late Rimbaud • Faust's Gretchen",
          desc: "The mature individual renouncing magical control over other people, returning from the enchanted island to mortal Milan where 'every third thought shall be my grave.'",
          audenQuote: "Prospero must drown his book because manipulating people—even 'for their own good' like Plato's Guardians or the Grand Inquisitor—destroys real love."
        },
        {
          pos: "OUTER MARGIN — THE SILENT REFUSER",
          name: "ANTONIO ('I Am I')",
          works: "The Tempest • Don Giovanni's 'No!' • Dante's Inferno",
          desc: "Standing outside the charmed circle of reconciliation, refusing Prospero's pardon without speaking a word.",
          audenQuote: "\"One link is missing, Prospero, you'll find... / As long as I choose to wear my stone smile.\""
        },
        {
          pos: "THE ROMANTIC HORIZON",
          name: "THE SEA vs. THE CITY (Pequod & Dutchman)",
          works: "Moby-Dick • Flying Dutchman • Middletown",
          desc: "In Classical literature, sailing the Sea is an unwelcome necessity to reach the City; in Romanticism, disgusted souls flee Middletown's Conformist Land for the Sea of absolute isolation.",
          audenQuote: "Ishmael survives the Pequod because Queequeg's friendship teaches him humble human solidarity; Ahab drowns trying to harpoon the Infinite."
        }
      ]
    },
    {
      id: "dante-kafka",
      tabTitle: "IV. Three Anatomies of the Quest",
      boardHeading: "FROM EPIC STAND TO PILGRIMAGE TO KAFKA'S CUT TELEPHONE",
      citation: "Synthesizing W. P. Ker, Dante, and Auden's 'K.'s Quest' (1947)",
      chalkSummary: "How does the individual's journey change when cosmic maps vanish? Compare Auden's three historical Quest structures.",
      type: "comparison",
      columns: ["QUEST ELEMENT", "MEDIEVAL PILGRIMAGE (DANTE)", "MODERN ANTI-QUEST (KAFKA'S K.)"],
      rows: [
        {
          axis: "1. The Summons & Map",
          left: "Crystal clear: Beatrice sends Virgil; Hell, Purgatory, and Heaven have exact moral geometry.",
          right: "Radically ambiguous: K. arrives in deep snow; the Mayor says hiring a Land-Surveyor was an old clerical mix-up.",
          audenNote: "In Dante, you may fail the climb, but you never doubt where the mountain top is. In Kafka, half the agony is wondering whether you are trespassing."
        },
        {
          axis: "2. Face of Authority",
          left: "Divine Wisdom & Love ('L'amor che move il sole e l'altre stelle').",
          right: "Exhausted secretaries in messy bedrooms sorting endless files for an unseen official named Klamm.",
          audenNote: "Auden insisted Kafka is NOT saying God is evil—Kafka is portraying how transcendent Grace looks to an anxious modern ego that tries to grab salvation like a legal permit!"
        },
        {
          axis: "3. Role of Other People",
          left: "Communion of saints & teachers (Virgil, Statius, Matilda, Beatrice) cheering every upward step.",
          right: "Villagers speaking cryptic protocol; K. disastrously tries to *use* Frieda as leverage to reach Klamm.",
          audenNote: "Notice K.'s moral error! Just like Faust with Gretchen, K. treats Frieda instrumentally as a shortcut to the Castle—and loses his footing."
        },
        {
          axis: "4. The Moment of Grace",
          left: "Drinking from Lethe & Eunoë; sight transfigured in eternal light.",
          right: "At 4 a.m., secretary Bürgel explains how an accidental night visitor could win everything—while exhausted K. snores!",
          audenNote: "Kafka's funniest, most poignant scene! Salvation cannot be bullied out of heaven by willpower; it arrives as an unmerited gift when our proud defenses finally collapse."
        }
      ]
    }
  ],

  chalkSorter: [
    {
      id: "sort-antigone",
      name: "Antigone",
      work: "Sophocles, Antigone",
      correctBucket: "necessity",
      clue: "Honors eternal unwritten blood-law and walks open-eyed into the rock tomb without inward doubt.",
      feedback: "Chalked under NECESSITY! Antigone does not 'agonize' like Hamlet—she embodies an immovable sacred law colliding with Creon's state decree."
    },
    {
      id: "sort-giovanni",
      name: "Don Giovanni",
      work: "Mozart & Da Ponte",
      correctBucket: "aesthetic",
      clue: "Lives solely in musical present-tense seduction while Leporello counts 2,065 names.",
      feedback: "Chalked under AESTHETIC IMMEDIACY! Kierkegaard and Auden's archetype of pure sensual momentum without memory or ethical continuity."
    },
    {
      id: "sort-ahab",
      name: "Captain Ahab",
      work: "Melville, Moby-Dick",
      correctBucket: "demonic",
      clue: "Claims 'I am the Fates' lieutenant!' while refusing Starbuck's pleas and the weeping captain of the Rachel.",
      feedback: "Chalked under DEMONIC DEFIANCE! Don't fall for Ahab's Greek-fate talk—Auden proved he is a Christian rebel choosing monomaniacal pride over forgiveness."
    },
    {
      id: "sort-leonore",
      name: "Leonore ('Fidelio')",
      work: "Beethoven, Fidelio",
      correctBucket: "ethical-religious",
      clue: "Works months in a grim prison kitchen disguised as a boy to shield her starving husband from a tyrant's dagger.",
      feedback: "Chalked under ETHICAL FIDELITY & GRACE! Auden's favorite rebuttal to Romanticism: kept marriage vows brave enough to topple dungeons."
    },
    {
      id: "sort-peergynt",
      name: "Peer Gynt",
      work: "Henrik Ibsen",
      correctBucket: "aesthetic",
      clue: "'Goes roundabout' every commitment until he peels a wild onion and finds zero kernel inside.",
      feedback: "Chalked under AESTHETIC IMMEDIACY! By keeping every option uncommitted, Peer nearly winds up melted down as raw material in the Button-Moulder's ladle."
    },
    {
      id: "sort-iago",
      name: "Ensign Iago",
      work: "Shakespeare, Othello",
      correctBucket: "demonic",
      clue: "Whispers 'I am not what I am' and ruins Desdemona and Othello like laboratory specimens.",
      feedback: "Chalked under DEMONIC DEFIANCE! Auden's 'Joker in the Pack'—the bored nihilist-scientist who destroys free persons to prove goodness is a lie."
    },
    {
      id: "sort-agamemnon",
      name: "King Agamemnon",
      work: "Aeschylus (MacNeice trans.)",
      correctBucket: "necessity",
      clue: "Returns at the peak of royal fortune and steps onto crimson cloth under the ancestral curse of Atreus.",
      feedback: "Chalked under NECESSITY! His royal triumph and family Ate form the classic closed circuit of Greek tragedy."
    },
    {
      id: "sort-harry",
      name: "Harry, Lord Monchensey",
      work: "T. S. Eliot, The Family Reunion",
      correctBucket: "ethical-religious",
      clue: "Stops fleeing the terrifying Eumenides at Wishwood and follows them outward as 'bright angels' of expiation.",
      feedback: "Chalked under ETHICAL FIDELITY & GRACE! The exact moment ancestral Necessity transforms into chosen spiritual Vocation."
    }
  ]
};

// ===========================================================================
// ROOM 4: 1227 PONTIAC STREET — ALL 9 SYLLABUS OPERA LIBRETTI & SYNTH RECORDS
// ===========================================================================
window.AUDEN_VICTROLA = [
  {
    id: "rec-dongiovanni",
    catalogNo: "HMV DB-2961 • 78 RPM",
    composer: "W. A. Mozart",
    librettist: "Lorenzo Da Ponte (1787)",
    title: "Don Giovanni",
    sceneTitle: "Act II Finale — The Stone Guest's Knock & 'No!'",
    sphereTag: "Pure Aesthetic Vitality vs. Judgment",
    keySignature: "D Minor • Andante con moto",
    tempoBpm: 76,
    labelColor: "#8c2d19",
    // Notes: [midiNoteOrArray, durationBeats, velocity]
    motifNotes: [
      [[50, 57, 62, 65], 2.0, 0.95], // Massive D-minor Commendatore chord!
      [[0], 0.4, 0],
      [[50, 57, 62, 65], 1.6, 0.95],
      [[49, 55, 57, 64], 1.8, 0.85], // Diminished/A7 tension
      [[50, 53, 57, 62], 1.8, 0.9],
      [[62], 0.5, 0.7], [[62], 0.5, 0.75], [[62], 0.5, 0.8], [[62], 0.5, 0.85], // Dotted inexorable tread
      [[63, 51, 57], 1.6, 0.92],     // Neapolitan / diminished chill
      [[57, 61, 64, 69], 1.6, 0.9],  // A major dominant
      [[50, 57, 62], 2.4, 0.95]      // Final D minor verdict
    ],
    musicalAnatomy: "Two terrifying, granitic D-minor chords announce the marble Commendatore—followed by a relentless dotted walking bass that refuses Don Giovanni's sparkling major-key evasions.",
    librettoOriginal: "IL COMMENDATORE: Pentiti, cangia vita: è l'ultimo momento!\nDON GIOVANNI: No, no, ch'io non mi pento; vanne lontan da me!\nIL COMMENDATORE: Pentiti, scellerato!\nDON GIOVANNI: No, vecchio infatuato!",
    librettoEnglish: "THE STATUE: Repent, change your life: it is your final moment!\nDON GIOVANNI: No, no, I do not repent; get far away from me!\nTHE STATUE: Repent, wretch!\nDON GIOVANNI: No, old fool!",
    audenCommentary: "Spinning the famous 1936 Glyndebourne 78s, Auden paired Da Ponte with Kierkegaard: throughout the opera Giovanni is sheer careless biology in motion, yet at midnight, clasping a frozen marble hand, he becomes a genuine rebel by shouting 'No!' five times rather than whimpering.",
    directorPrompt: "Suppose you are staging this bar for Prof. Auden: how should Don Giovanni deliver his final 'No!'?",
    directorChoices: [
      {
        text: "Defiantly upright—choosing damnation consciously rather than betraying his Aesthetic autonomy.",
        correct: true,
        reply: "Bravissimo! Auden noted that only in refusing the Statue does Giovanni step out of mere appetite into tragic choice—parallel to Dante's Farinata and Shakespeare's Antonio."
      },
      {
        text: "Pleading tearfully that childhood trauma in Seville left him no free choice.",
        correct: false,
        reply: "Auden groans and lifts the Victrola needle! 'My dear fellow, Giovanni is not a modern sociological case-study—if he blames his nanny, the D-minor chords lose their whole point!'"
      }
    ]
  },
  {
    id: "rec-magicflute",
    catalogNo: "Electrola DB-3465 • 78 RPM",
    composer: "W. A. Mozart",
    librettist: "Emanuel Schikaneder (1791)",
    title: "The Magic Flute (Die Zauberflöte)",
    sceneTitle: "Three Temple Chords & Papageno's Panpipe",
    sphereTag: "Natural Creatureliness + Ethical Trial",
    keySignature: "E-flat Major / G Major",
    tempoBpm: 96,
    labelColor: "#1b4d6e",
    motifNotes: [
      [[51, 58, 63, 67], 1.3, 0.9],  // I: First solemn Masonic Eb chord
      [[0], 0.35, 0],
      [[56, 60, 63, 68], 1.3, 0.9],  // II: Second chord (Ab/Eb)
      [[0], 0.35, 0],
      [[51, 58, 63, 70], 1.8, 0.95], // III: Third luminous Eb chord
      [[0], 0.5, 0],
      [[67], 0.28, 0.75], [[69], 0.28, 0.75], [[71], 0.28, 0.8], [[72], 0.28, 0.85], [[74], 0.7, 0.9] // Papageno's 5-note cheerful panpipe!
    ],
    musicalAnatomy: "Three solemn, architectural E-flat major wind chords summon Tamino to Ethical adulthood—immediately answered by bird-catcher Papageno's irresistible five-note folk whistle (G–A–B–C–D)!",
    librettoOriginal: "PAPAGENO: Der Vogelfänger bin ich ja, stets lustig, heissa, hopsassa!\nTAMINO & PAMINA: Wir wandelten durch Feuergluten, bekämpften mutig Tod und Schmerz.",
    librettoEnglish: "PAPAGENO: The bird-catcher am I indeed, always merry, hey-ho!\nTAMINO & PAMINA: We walked through glowing flames, courageously fighting death and pain.",
    audenCommentary: "Auden loved Die Zauberflöte so fiercely he later translated the whole opera with Chester Kallman! Notice Mozart's anti-Manichean wisdom: Sarastro's solemn temple honors Ethical mastery, yet Papageno's cheerful five-note whistle reminds us our bodily Caliban-nature is blessed, not cursed.",
    directorPrompt: "Why did Auden insist The Magic Flute needs BOTH Sarastro's solemn chords and Papageno's whistle?",
    directorChoices: [
      {
        text: "Because any Ethical enlightenment that despises ordinary creaturely affection turns into inhuman pride.",
        correct: true,
        reply: "Pure Auden! Just as Prospero must acknowledge Caliban ('this thing of darkness I acknowledge mine'), Tamino's temple needs Papageno's cottage."
      },
      {
        text: "Because 18th-century Viennese law required at least one bird-catcher in every opera.",
        correct: false,
        reply: "Wystan chuckles: 'Schikaneder certainly loved box-office laughs, but Mozart turned theatrical slapstick into theological balance!'"
      }
    ]
  },
  {
    id: "rec-fidelio",
    catalogNo: "Victor M-590 • 78 RPM",
    composer: "Ludwig van Beethoven",
    librettist: "Sonnleithner & Treitschke (1814)",
    title: "Fidelio",
    sceneTitle: "Act I/II — Prisoners' Emergence & Leonore's Rescue Fanfare",
    sphereTag: "Supreme Ethical Marriage",
    keySignature: "B-flat Major • Allegro",
    tempoBpm: 92,
    labelColor: "#2d6a4f",
    motifNotes: [
      [[58, 62, 65], 1.2, 0.55],     // Quiet emerging prisoners' triad
      [[60, 65, 69], 1.2, 0.68],     // Rising toward light
      [[62, 65, 70], 1.5, 0.82],     // 'O welche Lust!'
      [[0], 0.3, 0],
      [[58], 0.35, 0.9], [[62], 0.35, 0.9], [[65], 0.35, 0.92], [[70], 1.6, 0.98], // Heroic trumpet call!
      [[69, 65, 60], 0.8, 0.85],
      [[58, 62, 65, 70], 2.0, 0.95]
    ],
    musicalAnatomy: "Out of dungeon gloom, rising thirds climb into open air ('O welche Lust!'), crowned by the offstage B-flat trumpet call announcing tyranny's fall just as Leonore shields Florestan.",
    librettoOriginal: "LEONORE: Zurück! Töt' erst sein Weib!\nPIZARRO: Sein Weib?\nFLORESTAN: Mein Weib! O was hast du für mich erduldet!",
    librettoEnglish: "LEONORE: Stand back! First kill his wife!\nPIZARRO: His wife?\nFLORESTAN: My wife! Oh, what have you endured for me!",
    audenCommentary: "Whenever students swooned over Romantic doomed lovers, Auden slapped Beethoven's Fidelio on the turntable: 'Ask yourselves—would Tristan scrub prison pots for six months in boots to rescue Isolde?' Ethical fidelity isn't prosaic; it is heroic.",
    directorPrompt: "How does Beethoven's offstage trumpet call right after Leonore cries 'First kill his wife!' embody Auden's theology of action?",
    directorChoices: [
      {
        text: "Leonore risks her life *before* knowing any rescue trumpet will sound—grace meets human courage already in motion.",
        correct: true,
        reply: "Magnificent! Had the trumpet sounded *first*, Leonore's stand would have cost nothing. Courage steps into the dark before Providence answers."
      },
      {
        text: "Leonore blew the trumpet herself from inside her coat pocket.",
        correct: false,
        reply: "Auden laughs aloud: 'Even Kirsten Flagstad's lungs couldn't manage a pistol in one hand and a brass trumpet in the other!'"
      }
    ]
  },
  {
    id: "rec-tristan",
    catalogNo: "Victor M-644 • Flagstad & Melchior",
    composer: "Richard Wagner",
    librettist: "Richard Wagner (1865)",
    title: "Tristan und Isolde",
    sceneTitle: "Prelude — The Unresolved 'Tristan Chord' of Infinite Yearning",
    sphereTag: "Romantic Night & Liebestod",
    keySignature: "A Minor (Tonally Suspended) • Langsam und schmachtend",
    tempoBpm: 54,
    labelColor: "#4a2545",
    motifNotes: [
      [[57], 0.9, 0.65],             // A
      [[65], 1.4, 0.78],             // Leap of minor sixth to F
      [[64], 0.6, 0.75],             // E
      [[53, 59, 63, 68], 2.3, 0.9],  // THE TRISTAN CHORD: F - B - D# - G#!
      [[53, 59, 63, 69], 0.7, 0.85], // Chromatic climb to A
      [[53, 59, 63, 70], 0.7, 0.88], // A#
      [[52, 59, 62, 71], 2.5, 0.92]  // Unresolved E7 dominant seventh hanging in air!
    ],
    musicalAnatomy: "A solitary cello leaps a yearning sixth, landing on music history's most famous dissonance—the Tristan Chord (F–B–D#–G#)—which chromatically climbs only to hang unresolved on a dominant seventh, refusing earthly rest.",
    librettoOriginal: "TRISTAN & ISOLDE: O sink hernieder, Nacht der Liebe, gib Vergessen, dass ich lebe; nimm mich auf in deinen Schoß, löse von der Welt mich los!",
    librettoEnglish: "TRISTAN & ISOLDE: O sink down upon us, Night of Love, grant forgetting that I live; take me up into your embrace, sever me from the world!",
    audenCommentary: "Auden played Flagstad and Melchior's records in rapture—and immediately warned his class against Wagner's spell! Notice how the chord *refuses* to come home: Romantic Eros hates daylight marriage because everyday life cures fever, so it secretly worships Death to keep yearning eternal.",
    directorPrompt: "Listen to that final chord refusing to resolve cleanly to A minor. What psychological truth did Auden hear in it?",
    directorChoices: [
      {
        text: "Tristan and Isolde are in love with *infinite longing itself*—earthly fulfillment would spoil their myth, so only Night and Death satisfy them.",
        correct: true,
        reply: "Bullseye! Reading Wagner alongside C. S. Lewis's Allegory of Love, Auden diagnosed Liebestod as Aesthetic passion mistaking annihilation for heaven."
      },
      {
        text: "Wagner's piano in Zurich had four broken keys so he left the prelude unfinished.",
        correct: false,
        reply: "Not a chance! Wagner withheld final tonic resolution for four hours until Isolde's dying breath—pure sonic hypnosis."
      }
    ]
  },
  {
    id: "rec-orpheus",
    catalogNo: "Columbia LX-841 • 78 RPM",
    composer: "Christoph Willibald Gluck",
    librettist: "Ranieri de' Calzabigi (1762)",
    title: "Orpheus and Eurydice",
    sceneTitle: "Act III — 'Che farò senza Euridice?' in Serene C Major",
    sphereTag: "Formal Grace vs. Impatient Doubt",
    keySignature: "C Major • Andante espressivo",
    tempoBpm: 84,
    labelColor: "#8a6220",
    motifNotes: [
      [[60, 64, 67], 1.0, 0.78],     // C major: 'Che fa-'
      [[64, 60], 0.5, 0.75],         // '-rò'
      [[62, 59, 67], 1.0, 0.78],     // 'sen-za'
      [[60, 64], 1.0, 0.82],         // 'Eu-ri-'
      [[65, 69, 60], 1.1, 0.85],     // '-di-'
      [[64, 60, 67], 1.1, 0.8],      // '-ce?'
      [[62, 65, 69], 0.9, 0.82],
      [[59, 62, 67], 0.9, 0.8],
      [[60, 64, 67, 72], 2.0, 0.88]  // Poised C-major cadence
    ],
    musicalAnatomy: "Instead of hysterical minor-key wailing over Eurydice's second death, Gluck sets Orpheus's grief in poised, sunlit C major—turning raw biological anguish into disciplined classical song.",
    librettoOriginal: "ORFEO: Che farò senza Euridice? Dove andrò senza il mio ben? Euridice! Oh Dio! Rispondi! Io son pure il tuo fedel!",
    librettoEnglish: "ORPHEUS: What shall I do without Eurydice? Where shall I go without my beloved? Eurydice! Oh God! Answer! I am still your faithful one!",
    audenCommentary: "Critics often complained Gluck's melody sounds 'too bright' for bereavement. Nonsense, said Auden! Animals howl by Necessity; human beings sing in form—proving even in heartbreak that spirit is freer than brute pain.",
    directorPrompt: "Why did Orpheus look back one moment before reaching daylight?",
    directorChoices: [
      {
        text: "Like Kierkegaard's anxious doubter, he demanded immediate visible reassurance instead of walking by patient trust.",
        correct: true,
        reply: "Spot on! Art's lyre charmed Hell's monsters, yet only humble faith could finish the walk home."
      },
      {
        text: "Pluto tricked him by shouting 'Fire!' from behind.",
        correct: false,
        reply: "No external trick! Just like Augustine, Orpheus's defeat comes from his own anxious, divided heart."
      }
    ]
  },
  {
    id: "rec-carmen",
    catalogNo: "Victor M-128 • 78 RPM",
    composer: "Georges Bizet",
    librettist: "Meilhac & Halévy (1875)",
    title: "Carmen",
    sceneTitle: "Chromatic Habanera & The Brass Fate Motif",
    sphereTag: "Lucid Courage vs. Self-Pitying Murder",
    keySignature: "D Minor • Allegretto quasi andantino",
    tempoBpm: 88,
    labelColor: "#9e2a2b",
    motifNotes: [
      [[62], 0.65, 0.85], [[61], 0.65, 0.82], [[60], 0.5, 0.8], [[60], 0.3, 0.75], // Chromatic descending Habanera: D - C# - C - C
      [[59], 0.65, 0.8], [[58], 0.65, 0.82], [[57], 1.1, 0.88],                    // B - Bb - A!
      [[0], 0.35, 0],
      [[57, 62], 0.5, 0.9], [[58, 62], 0.5, 0.9], [[56, 62], 0.9, 0.95], [[57, 61, 64], 1.8, 0.95] // Augmented-second Fate Motif!
    ],
    musicalAnatomy: "Carmen's Habanera slides chromatically down step by half-step like an untamable bird, answered by the stark augmented-second 'Fate Motif' that tolls over the bullring finale.",
    librettoOriginal: "DON JOSÉ: Ainsi, le salut de mon âme, je l'aurai perdu pour que toi, tu t'en ailles chez lui!\nCARMEN: Jamais Carmen ne cédera! Libre elle est née et libre elle mourra!",
    librettoEnglish: "DON JOSÉ: So I shall have lost the salvation of my soul just so you can run to him!\nCARMEN: Carmen will never yield! Free she was born, and free she will die!",
    audenCommentary: "Listen to Don José's cowardly grammar: *he* blames Carmen for losing *his* soul! Meanwhile fatalist Carmen—who saw death in the tarot spades—refuses to buy survival with a single false 'I love you.'",
    directorPrompt: "What makes Carmen an unexpectedly noble foil to Othello and Don José in Auden's seminar?",
    directorChoices: [
      {
        text: "She owns her choices without self-pitying excuses, exposing José's 'fatal passion' as possessive vanity.",
        correct: true,
        reply: "Bravo! Just like Nietzsche, Auden cheered Carmen's sunlit honesty over sentimental romantic blackmail."
      },
      {
        text: "She convinces José to read Horace's Odes and retire to a farm.",
        correct: false,
        reply: "If only poor José had read a bit of Horace! Instead he acts out every bad cliché of possessive melodrama."
      }
    ]
  },
  {
    id: "rec-dutchman",
    catalogNo: "HMV DB-5540 • 78 RPM",
    composer: "Richard Wagner",
    librettist: "Richard Wagner (1843)",
    title: "The Flying Dutchman",
    sceneTitle: "Overture — The Open-Fifth Sea Horn Call & Senta's Redemption",
    sphereTag: "The Cursed Sea-Hero (Enchafèd Flood)",
    keySignature: "D Minor -> D Major",
    tempoBpm: 94,
    labelColor: "#264653",
    motifNotes: [
      [[50, 57], 1.4, 0.95],         // Stark open fifth D - A (Dutchman's horn call!)
      [[62], 0.45, 0.9],
      [[50, 57], 1.8, 0.95],
      [[0], 0.4, 0],
      [[65, 69], 0.9, 0.72],         // Senta's gentle lyrical answer
      [[64, 67], 0.9, 0.72],
      [[62, 66, 69, 74], 2.2, 0.9]   // Transfiguring D-major redemption chord
    ],
    musicalAnatomy: "Hollow, storm-lashed open fifths (D–A, missing the warm third!) paint the cursed Wanderer on the ocean, softened at the close into Senta's luminous D-major chord.",
    librettoOriginal: "DER HOLLÄNDER: Die Frist ist um, und abermals verstrichen sind sieben Jahr!\nSENTA: Preis deinen Engel und sein Gebot! Hier steh' ich, treu dir bis zum Tod!",
    librettoEnglish: "THE DUTCHMAN: The term is up, and once again seven years have passed!\nSENTA: Praise your angel and his decree! Here I stand, faithful to you unto death!",
    audenCommentary: "Here begins Auden's book The Enchafèd Flood: the lonely Byronic/Wagnerian Sea-Captain too Titanic for ordinary town life, expecting an idealized woman to leap off a cliff to cure his existential boredom!",
    directorPrompt: "How did Auden critique the Romantic 'Redemption-by-a-Woman's-Suicide' trope in The Flying Dutchman?",
    directorChoices: [
      {
        text: "No human being can serve as another ego's private messiah—turning Senta into a savior-device obliterates real mutual neighbor-love.",
        correct: true,
        reply: "Spot on! Compare Senta leaping to her death with Beethoven's Leonore rescuing Florestan *so both can live*."
      },
      {
        text: "He complained seven years was far too short a sea voyage.",
        correct: false,
        reply: "Try reading 6,000 pages in fourteen weeks—that feels longer than seven years round the Cape!"
      }
    ]
  },
  {
    id: "rec-gotterdammerung",
    catalogNo: "Victor M-188 • 78 RPM",
    composer: "Richard Wagner",
    librettist: "Richard Wagner (1876)",
    title: "Götterdämmerung",
    sceneTitle: "Immolation Finale — Valhalla's Fall & Return of the Gold",
    sphereTag: "Power's Curse vs. Sacrificial End",
    keySignature: "E-flat / D-flat Major • Feierlich",
    tempoBpm: 72,
    labelColor: "#6b4226",
    motifNotes: [
      [[54, 58, 61], 1.3, 0.85],     // Solemn Valhalla brass tread
      [[56, 60, 63], 1.3, 0.88],
      [[58, 61, 65], 1.5, 0.92],
      [[66, 70, 73], 0.9, 0.82],     // Soaring Redemption-by-Love violin arc
      [[65, 68, 73], 0.9, 0.85],
      [[61, 65, 68, 73], 2.4, 0.92]
    ],
    musicalAnatomy: "Stately Valhalla brass chords—built on Wotan's compromised treaties—dissolve beneath Brünnhilde's soaring violin melody as the cursed Ring returns to the Rhine.",
    librettoOriginal: "BRÜNNHILDE: Ruhe, ruhe, du Gott! ... Verging wie Hauch der Götter Geschlecht, lass' ohne Walter die Welt ich zurück: meines heiligsten Wissens Hort weis' ich der Welt nun zu!",
    librettoEnglish: "BRÜNNHILDE: Rest, rest, thou God! ... Though the race of gods pass away like a breath, I leave the world behind without ruler, bequeathing to it the treasure of my holiest wisdom!",
    audenCommentary: "Listening to Valhalla burn in late 1941 needed zero translation: any civilization built on Alberich's original bargain—renouncing Love to wield total Power—engineers its own twilight.",
    directorPrompt: "Why are even the gods (Wotan) helpless to stop catastrophe in Götterdämmerung?",
    directorChoices: [
      {
        text: "Because Wotan's authority rests on treaties he himself corrupted through greed—proving power politics traps its own master.",
        correct: true,
        reply: "Exact! Just like Agamemnon and Creon, pagan gods in Wagner are subjects of Necessity, not free creators."
      },
      {
        text: "Because the Rhine Maidens hired Ben Jonson's Mosca as their lawyer.",
        correct: false,
        reply: "Though Mosca would certainly have swindled Alberich out of the gold in five minutes!"
      }
    ]
  },
  {
    id: "rec-traviata",
    catalogNo: "Victor M-112 • 78 RPM",
    composer: "Giuseppe Verdi",
    librettist: "Francesco Maria Piave (1853)",
    title: "La Traviata",
    sceneTitle: "Prelude & Act II — Fragile Strings & 'Amami, Alfredo!'",
    sphereTag: "Bourgeois Pseudo-Fate vs. Agape",
    keySignature: "E Major / F Major • Adagio",
    tempoBpm: 68,
    labelColor: "#7a2e4d",
    motifNotes: [
      [[64, 68, 71], 1.4, 0.65],     // Ethereal high strings (Violetta's frailty)
      [[63, 66, 71], 1.2, 0.68],
      [[64, 68, 71], 1.2, 0.72],
      [[69, 72, 76], 1.5, 0.92],     // Sweeping 'Amami, Alfredo!' swell!
      [[68, 71, 76], 0.8, 0.88],
      [[66, 69, 73], 0.9, 0.82],
      [[64, 68, 71, 76], 2.2, 0.9]
    ],
    musicalAnatomy: "Glass-fragile divided violins whisper Violetta's mortality before bursting into the great heart-rending arc of 'Amami, Alfredo!'—an outcast loving more generously than respectable Paris.",
    librettoOriginal: "VIOLETTA: Amami, Alfredo, quant'io t'amo... Addio! / GERMONT: Ah, il suo cor grandeggia!",
    librettoEnglish: "VIOLETTA: Love me, Alfredo, as much as I love you... Farewell! / GERMONT: Ah, how noble is her heart!",
    audenCommentary: "Pair La Traviata with Middletown! Respectable bourgeois society tells Violetta 'Once a courtesan, forever fated to stay one,' yet her unselfish sacrifice humbles the moralizing father who came to lecture her.",
    directorPrompt: "What 'Fate' crushes Violetta alongside tuberculosis—and how does she transcend it?",
    directorChoices: [
      {
        text: "Hypocritical social caste ('respectability') treats her past as immutable destiny, yet her free, unresentful sacrifice proves inward grace outranks social status.",
        correct: true,
        reply: "Sublime! Verdi's outcast heroine quietly graduates to the highest Kierkegaardian sphere while polite society stands ashamed."
      },
      {
        text: "An ancient Greek oracle in Delphi cursed her family.",
        correct: false,
        reply: "In 1850s Paris, the oracle wears a bourgeois top hat and worries about his daughter's dowry!"
      }
    ]
  }
];

// ===========================================================================
// ROOM 5: THE THREE MERCIFULLY HUMANE ASSIGNMENTS
// ===========================================================================
window.AUDEN_ASSIGNMENTS = {
  // LAB 1: DANTE'S TERZA RIMA WEAVER (Replacing the 6-Canto Memorization Ordeal!)
  danteCantos: [
    {
      id: "canto-inferno5",
      cantoLabel: "Tercet I • Inferno, Canto V (Paolo & Francesca)",
      rhymeScheme: "Interlocking Terza Rima (-ore / -ona / -ore)",
      italianLines: [
        "Amor, ch'al cor gentil ratto s'apprende,",
        "Amor, ch'a nullo amato amar perdona,",
        "[ ? ]"
      ],
      englishContext: "Francesca blames 'Love' as an irresistible feudal lord seizing two passive readers—the exact deterministic excuse Auden dissected.",
      options: [
        {
          line: "mi prese del costui piacer sì forte, che, come vedi, ancor non m'abbandona.",
          trans: "('...seized me with delight in him so strongly that, as thou seest, it still abandons me not.')",
          correct: true,
          note: "Rhyme & Theology locked! Notice 'perdona / non m'abbandona'—even in Hell, Francesca clings passively to the whirlwind she claims she couldn't resist."
        },
        {
          line: "ma per trattar del ben ch'i' vi trovai, dirò de l'altre cose ch'i' v'ho scorte.",
          trans: "('...but to treat of the good I found there, I will tell of other things I saw.')",
          correct: false,
          note: "That belongs to Inferno Canto I! Watch Dante's '-ona' chain rhyme (perdona -> abbandona)."
        },
        {
          line: "l'amor che move il sole e l'altre stelle.",
          trans: "('...the Love that moves the sun and the other stars.')",
          correct: false,
          note: "That's the blessed finale of Paradiso XXXIII—the exact opposite of Francesca's self-excusing 'Amor'!"
        }
      ]
    },
    {
      id: "canto-inferno26",
      cantoLabel: "Tercet II • Inferno, Canto XXVI (Ulysses' Last Voyage)",
      rhymeScheme: "Heroic Curiosity Without Humility (-enza / -ute / -enza)",
      italianLines: [
        "Considerate la vostra semenza:",
        "fatti non foste a viver come bruti,",
        "[ ? ]"
      ],
      englishContext: "Speaking from a tongue of flame, Ulysses recalls the thrilling speech with which he persuaded his aging crew to sail past mortal bounds—foreshadowing Faust and Ahab!",
      options: [
        {
          line: "ma per seguir virtute e canoscenza.",
          trans: "('...but to follow virtue and knowledge!')",
          correct: true,
          note: "Magnificent! 'Semenza / canoscenza'—noble words, yet Ulysses abandoned home, wife, and father solely for restless Aesthetic curiosity, shipwrecking before Mount Purgatory."
        },
        {
          line: "lasciate ogne speranza, voi ch'intrate.",
          trans: "('...abandon all hope, ye who enter here.')",
          correct: false,
          note: "That's inscribed over Hell's gate in Canto III, breaking the '-enza' rhyme!"
        },
        {
          line: "e caddi come corpo morto cade.",
          trans: "('...and I fell as a dead body falls.')",
          correct: false,
          note: "That's Dante fainting at the end of Canto V—not Ulysses' siren call to knowledge."
        }
      ]
    },
    {
      id: "canto-purg27",
      cantoLabel: "Tercet III • Purgatorio, Canto XXVII (Virgil Crowns Dante Free)",
      rhymeScheme: "The Healed Will (-io / -arbitrio / -io)",
      italianLines: [
        "Non aspettar mio dir più né mio cenno;",
        "libero, dritto e sano è tuo arbitrio,",
        "[ ? ]"
      ],
      englishContext: "At the summit of Mount Purgatory, after walking through cleansing fire, Dante's divided Augustinian will is finally whole—so Virgil (Ethical Reason) sets him free!",
      options: [
        {
          line: "e fallo fora non fare a suo senno: per ch'io te sovra te corono e mitrio.",
          trans: "('...and it would be wrong not to act on its judgment: therefore I crown and miter thee over thyself!')",
          correct: true,
          note: "The summit of Ethical freedom! 'Arbitrio / mitrio'—once desire is purified of pride, you no longer need a policeman; you are crowned sovereign over yourself."
        },
        {
          line: "nessun maggior dolore che ricordarsi del tempo felice ne la miseria.",
          trans: "('...there is no greater sorrow than recalling happy times in misery.')",
          correct: false,
          note: "That's Francesca sighing in Hell again—breaking Virgil's '-io / -itrio' rhyme!"
        },
        {
          line: "nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura.",
          trans: "('...midway upon the journey of our life I woke in a dark wood.')",
          correct: false,
          note: "That's where the poem *began*—before twenty-seven cantos of climbing!"
        }
      ]
    },
    {
      id: "canto-par33",
      cantoLabel: "Tercet IV • Paradiso, Canto XXXIII (Freedom Perfected in Peace)",
      rhymeScheme: "Cosmic Harmony (-ace / -elle)",
      italianLines: [
        "E 'n la sua volontade è nostra pace:",
        "ell' è quel mare al qual tutto si move...",
        "[ ? ]"
      ],
      englishContext: "Piccarda and the final vision of Paradise answer the whole seminar's question: does surrendering to divine Love erase individuality, or fulfill it like a wheel turning smoothly?",
      options: [
        {
          line: "ma già volgeva il mio disio e 'l velle, sì come rota ch'igualmente è mossa, l'amor che move il sole e l'altre stelle.",
          trans: "('...already my desire and my will were turned, like a wheel moved evenly, by the Love that moves the sun and the other stars.')",
          correct: true,
          note: "Six-canto reprieve GRANTED! Notice Dante distinguishes *disio* (heart's desire) and *velle* (conscious will)—split apart since Augustine, now spinning as one harmonious wheel."
        },
        {
          line: "per me si va ne la città dolente, per me si va ne l'etterno dolore.",
          trans: "('...through me the way into the suffering city.')",
          correct: false,
          note: "Good heavens, don't march straight out of Paradise back through Hell's gate!"
        },
        {
          line: "fatti non foste a viver come bruti.",
          trans: "('...ye were not made to live like brutes.')",
          correct: false,
          note: "Ulysses' proud speech stops short of grace—here desire and will turn together in love."
        }
      ]
    }
  ],

  // LAB 2: HORACE ODE I.11 TRANSLATION TUNER
  horaceLines: [
    {
      id: "hor-1",
      latin: "Tu ne quaesieris, scire nefas, quem mihi, quem tibi finem di dederint, Leuconoë...",
      literal: "Do not inquire—it is unlawful to know—what end the gods have granted to me or to you, Leuconoë...",
      variants: [
        {
          style: "Audenesque Dry Wit",
          text: "Don't ask, my dear—it isn't manners to pry—what terminal date the gods have penciled in for us,",
          poiseScore: 35,
          feedback: "Crisp, conversational, anti-theatrical! Auden loved rendering Horace's 'nefas' as a breach of cosmic good manners."
        },
        {
          style: "Gushing Romantic",
          text: "O weep not, trembling maiden of my burning soul, before the dark abyss of inscrutable Doom!",
          poiseScore: 10,
          feedback: "Horace would spill his Falernian wine! Far too Wagnerian—Leuconoë isn't Isolde."
        },
        {
          style: "Bureaucratic Memo",
          text: "Pursuant to divine regulations, inquiries regarding projected mortality schedules are strictly prohibited,",
          poiseScore: 18,
          feedback: "Sounds like a secretary in Kafka's Castle—amusingly dry, though a touch too wooden for Sabine verse."
        }
      ]
    },
    {
      id: "hor-2",
      latin: "...nec Babylonios temptaris numeros. Ut melius, quidquid erit, pati!",
      literal: "...nor consult Babylonian astrological tables. How much better to endure whatever will be!",
      variants: [
        {
          style: "Audenesque Dry Wit",
          text: "and leave those Babylonian horoscopes alone: how much wiser to take whatever weather comes in stride.",
          poiseScore: 35,
          feedback: "Exact Horatian poise! 'Babylonios numeros' mocked fashionable Roman astrology—ancient determinism's newspaper column."
        },
        {
          style: "Gushing Romantic",
          text: "Curse the cruel stars! Let us hurl our defiant breasts against the thunderbolts of Destiny!",
          poiseScore: 5,
          feedback: "That's Captain Ahab on the quarterdeck, not Quintus Horatius Flaccus by his hearth!"
        },
        {
          style: "Bureaucratic Memo",
          text: "Avoid unauthorized statistical forecasting; passive compliance with upcoming outcomes is optimal.",
          poiseScore: 15,
          feedback: "Middletown chamber-of-commerce prose! Missing Horace's quiet human warmth."
        }
      ]
    },
    {
      id: "hor-3",
      latin: "Sapias, vina liques, et spatio brevi spem longam reseces.",
      literal: "Be wise, strain the wine, and within a brief span prune back long hope.",
      variants: [
        {
          style: "Audenesque Dry Wit",
          text: "Be sensible, decant the wine, and trim long-winded hopes to fit our modest lease.",
          poiseScore: 30,
          feedback: "Sublime! 'Reseces' is a gardener's pruning word—Horace treats extravagant anxiety like overgrown vines."
        },
        {
          style: "Gushing Romantic",
          text: "Drown thy mortal sorrow in intoxicating goblets, for all earthly hope is ashes!",
          poiseScore: 10,
          feedback: "Too melodramatic! Straining clear wine in Horace is an act of civilized measure, not Baudelairean bingeing."
        },
        {
          style: "Bureaucratic Memo",
          text: "Exercise prudence, filter beverages, and downsize long-term expectations proportionally.",
          poiseScore: 15,
          feedback: "Accurate enough to pass a Latin trot, cold enough to freeze the Sabine hills."
        }
      ]
    },
    {
      id: "hor-4",
      latin: "Dum loquimur, fugerit invida aetas: carpe diem, quam minimum credula postero.",
      literal: "Even while we speak, envious time will have fled: pluck the day, trusting as little as possible in tomorrow.",
      variants: [
        {
          style: "Audenesque Dry Wit",
          text: "Even as we chat, grudging time slips past: harvest today, and put no credit in tomorrow's promises.",
          poiseScore: 35,
          feedback: "Ten out of ten! 'Carpe' means plucking ripe fruit cleanly, and 'credula' is financial/personal gullibility—pure Auden!"
        },
        {
          style: "Gushing Romantic",
          text: "Time devours us! Seize wild ecstasy tonight before the grave yawns wide!",
          poiseScore: 10,
          feedback: "Turns calm Horatian gratitude into Don Giovanni's frantic 'Viva la libertà!'"
        },
        {
          style: "Bureaucratic Memo",
          text: "Time elapses during verbal exchange; utilize current date and minimize future reliance.",
          poiseScore: 15,
          feedback: "Even Henry Adams's Dynamo has more lyricism than 'utilize current date'!"
        }
      ]
    }
  ],

  // LAB 3: ST. AUGUSTINE'S DOUBLE-WILL & ALIBI CLINIC
  alibiCases: [
    {
      id: "case-pears",
      patient: "Case #1: Sixteen-Year-Old Aurelius Augustinus (Tagaste)",
      testimony: "\"Look, Professor, boys will be boys—we were just hungry teenagers walking past a neighbor's pear orchard late at night!\"",
      stamps: [
        { label: "Natural Bodily Hunger", correct: false, note: "Denied! Augustine himself confesses they had better pears at home and threw the stolen ones straight to hogs." },
        { label: "Perverse Pride & Gang Conformity", correct: true, note: "STAMPED! Alone he wouldn't have bothered; he loved the illicit thrill of 'doing what was not allowed' in front of laughing peers." },
        { label: "Greek Ancestral Curse", correct: false, note: "Denied! St. Monica was praying her heart out for him, not cursing his house." }
      ]
    },
    {
      id: "case-ahab",
      patient: "Case #2: Captain Ahab of the Whaler Pequod",
      testimony: "\"Stop lecturing me, Starbuck! 'This whole act's immutably decreed—'twas rehearsed by thee and me a billion years before this ocean rolled!'\"",
      stamps: [
        { label: "Genuine Greek Necessity (Moira)", correct: false, note: "Don't let Ahab fool you! Auden wrote 'The Christian Tragic Hero' specifically to debunk Ahab's phony fatalism." },
        { label: "Defiant Despair Disguised as Fate", correct: true, note: "STAMPED! Ahab invents cosmic determinism so he never has to humble his will or help Captain Gardiner search for his lost son." },
        { label: "Harmless Aesthetic Play", correct: false, note: "Hardly harmless when twenty-nine crewmen drown alongside his monomania!" }
      ]
    },
    {
      id: "case-iago",
      patient: "Case #3: Ancient Iago (Venetian Cyprus Garrison)",
      testimony: "\"Cassio got my lieutenantcy! Besides, I suspect the Moor with my nightcap—any red-blooded soldier would naturally seek revenge!\"",
      stamps: [
        { label: "Classic Passionate Jealousy", correct: false, note: "Coleridge called it 'motiveless malignity' and Auden went further: Iago cooks up new motives every scene because none of them are real." },
        { label: "The Nihilist Practical Joker / Scientist", correct: true, note: "STAMPED! As Auden drew on the Angell Hall blackboard, Iago experiments on Desdemona and Othello to prove free virtue is a mirage." },
        { label: "Ethical Duty to Venice", correct: false, note: "Sabotaging Venice's commander during a Turkish war crisis is the opposite of civic duty!" }
      ]
    },
    {
      id: "case-inquisitor",
      patient: "Case #4: The Ninety-Year-Old Cardinal of Seville (Ivan's Parable)",
      testimony: "\"We corrected Your work out of pure compassion! Weak, rebellious mortals cannot bear Your gift of freedom—only bread and authority make them happy!\"",
      stamps: [
        { label: "Authentic Christian Charity", correct: false, note: "Charity honors the beloved as a free person; turning people into docile sheep erases their humanity." },
        { label: "Paternalistic Contempt for Freedom", correct: true, note: "STAMPED! Crossman's Plato and Dostoevsky's Inquisitor meet here: trading away moral personhood for managed security." },
        { label: "Aesthetic Hedonism", correct: false, note: "Not at all! Like Ahab, the aged Inquisitor eats dry crusts in ascetic misery while ruling the happy herd." }
      ]
    },
    {
      id: "case-peergynt",
      patient: "Case #5: Elderly Peer Gynt at the Crossroads",
      testimony: "\"Melt me in a ladle?! Preposterous! I've been an independent Spirit my whole life—never tied down, always 'enough unto myself'!\"",
      stamps: [
        { label: "Heroic Self-Reliance", correct: false, note: "'To thyself be—enough!' is literally the Mountain Troll King's motto, not human freedom!" },
        { label: "Aesthetic Evasion (Onion Without a Kernel)", correct: true, note: "STAMPED! Refusing binding love didn't keep Peer free—it left him hollow until Solveig's faithful memory vouched for him." },
        { label: "Jansenist Predestination", correct: false, note: "Peer wasn't predestined—he 'went roundabout' every single fork of his own accord!" }
      ]
    }
  ]
};

// ===========================================================================
// ROOM 6: THE "IMPOSSIBLE & INHUMANE" FINAL EXAM (WITH HUMANE REPRIEVE MODE!)
// ===========================================================================
window.AUDEN_FINAL_EXAM = {
  questions: [
    {
      id: "ex-1",
      category: "Comparative Tragedy",
      prompt: "Suppose Sophocles' Oedipus (or Agamemnon) and Melville's Captain Ahab share a pot of tea at 1227 Pontiac Street. According to Auden's 'The Christian Tragic Hero', why would each find the other's story baffling?",
      humaneHint: "Ross Macdonald whispers: Check Auden's two tragedies—who starts healthy vs. already missing a leg, and whose future is truly fixed vs. freely chosen?",
      options: [
        "Agamemnon begins fortunate and falls by cosmic Necessity ('had to be'), whereas Ahab begins already maimed and freely chooses defiant pride while *pretending* it is fate ('might have been otherwise').",
        "Agamemnon believes in modern industrial dynamos, whereas Ahab worships the Olympian goddess Artemis.",
        "Both men agree completely that human beings possess zero free will in any century.",
        "Ahab repents before Act V, whereas Agamemnon sails happily to Nantucket."
      ],
      answer: 0,
      explanation: "Full marks! Auden's signature distinction: Greek tragedy reveals inescapable cosmic law through a fortunate ruler's fall; Christian tragedy exposes radical choice through a wounded rebel refusing grace."
    },
    {
      id: "ex-2",
      category: "Augustus to Augustine",
      prompt: "Why did Auden regard Charles Norris Cochrane's Christianity and Classical Culture (alongside St. Augustine's Confessions) as the crucial pivot between Horace and Dante?",
      humaneHint: "Wystan taps the slate: Classical philosophy split us into tidy Reason vs. unruly Bodily Passion/Fortuna. Where did Augustine locate the real split?",
      options: [
        "Augustine showed that our bondage lies not in external Fortuna or bodily matter, but inside a Divided Will whose disordered loves require Grace rather than mere Stoic poise.",
        "Cochrane proved that Horace secretly wrote the first six cantos of Dante's Inferno.",
        "Augustine argued that Babylonian astrology accurately predicts every human action.",
        "Classical Rome lacked any poetry until St. Augustine invented Latin meter."
      ],
      answer: 0,
      explanation: "Magnificent! Classical rationalism blamed error on ignorance or appetite; Augustine discovered the spirit's own perverse split ('bound by my own iron will'), making Dante's moral universe possible."
    },
    {
      id: "ex-3",
      category: "Shakespeare's Laboratory",
      prompt: "Link Shakespeare's Othello and The Tempest through Auden's essays ('The Joker in the Pack' & The Sea and the Mirror): what chilling truth unites Iago's whispers and Antonio's final silence?",
      humaneHint: "Think about radical negative freedom: Iago says 'I am not what I am,' and Antonio refuses to speak when Prospero forgives everyone.",
      options: [
        "Both dramatize the terrifying reality of human freedom to say 'No' to love and grace—Iago by treating persons as lab mechanisms, Antonio by refusing even Prospero's omnipotent art of reconciliation.",
        "Both characters are secretly magical spirits sent by Ariel to reward virtuous rulers.",
        "Both plays prove that theatrical art automatically makes every spectator morally good.",
        "Auden argued both characters were harmless comic buffoons like Papageno."
      ],
      answer: 0,
      explanation: "Bravo! Art (Prospero's mirror) can reveal truth, and law can restrain crime, yet neither magic nor poetry can compel an unrepentant ego ('I am I') to love."
    },
    {
      id: "ex-4",
      category: "Opera & Kierkegaard",
      prompt: "On Auden's Victrola, Mozart's Don Giovanni, Wagner's Tristan und Isolde, and Beethoven's Fidelio form a three-way argument about Love and Fate. Which reading matches Auden's lectures?",
      humaneHint: "Match Giovanni to sensual immediacy, Tristan to nocturnal death-longing, and Leonore to kept vows in daylight!",
      options: [
        "Don Giovanni embodies Aesthetic immediacy, Tristan und Isolde idolizes nocturnal Passion-unto-Death, and Fidelio vindicates Ethical married fidelity rescuing a real person into freedom.",
        "All three operas argue that marriage is boring and only magic potions create true freedom.",
        "Fidelio represents demonic nihilism, whereas Don Giovanni represents monastic humility.",
        "Auden assigned opera libretti solely to help students practice Italian pronunciation."
      ],
      answer: 0,
      explanation: "Ten out of ten! Nobody before or since Auden used opera records to teach Kierkegaard's Either/Or with such theatrical clarity."
    },
    {
      id: "ex-5",
      category: "Anthropology on Main Street",
      prompt: "Why did Auden place Ruth Benedict's Patterns of Culture, Margaret Mead's From the South Seas, and the Lynds' Middletown (Muncie, Indiana!) on a syllabus of European tragedy?",
      humaneHint: "What do Midwesterners call 'Fate' Monday through Saturday without realizing it?",
      options: [
        "To unmask how modern social conformity, economic habits, and cultural scripts operate as invisible 'pseudo-Fates'—forcing Ann Arbor students to examine their own lives alongside Thebes and Peer Gynt.",
        "To pad the credit hours because European literature had fewer than 500 pages.",
        "To prove that Muncie, Indiana had abolished all social pressure by 1929.",
        "Because University of Michigan rules forbade teaching poetry without statistics."
      ],
      answer: 0,
      explanation: "Spot on! Anthropology strips away the illusion that 'our town's habits are simply nature,' turning literary criticism into urgent self-examination."
    },
    {
      id: "ex-6",
      category: "Comedy & Selfhood",
      prompt: "Contrast Falstaff (Henry IV, Part 2), Volpone, and Ibsen's Peer Gynt through Auden's eyes: why did Auden cherish Falstaff while warning us against Volpone and Peer Gynt?",
      humaneHint: "Remember 'The Prince's Dog': Falstaff loves Hal without calculation, Volpone worships clever fraud, and Peer peels an empty onion!",
      options: [
        "Volpone enslaves himself to comic monomania and Peer Gynt evaporates by dodging commitment, whereas disreputable Falstaff radiates uncalculating affection exiled by Prince Hal's cold political necessity.",
        "Falstaff is an efficient bureaucratic king, while Peer Gynt dies a martyr for truth in Act I.",
        "All three characters are identical examples of Jansenist predestination.",
        "Auden despised Falstaff and praised Prince Hal's warmth."
      ],
      answer: 0,
      explanation: "Pure Auden magic! Only Auden could spot unfallen Eden hiding inside a disreputable tavern knight while exposing the hollowness of respectable careerists."
    },
    {
      id: "ex-7",
      category: "Pascal, Adams & Dostoevsky",
      prompt: "Draw a straight chalk line connecting Pascal's Pensées, Dostoevsky's 'Grand Inquisitor', and Henry Adams's 'Dynamo and the Virgin': what modern temptation do all three diagnose?",
      humaneHint: "Why do anxious 'thinking reeds' welcome distraction, bread-giving dictators, or impersonal megawatts?",
      options: [
        "Faced with existential anxiety, modern individuals are tempted to flee personal moral responsibility—either into distraction (Pascal), benevolent authoritarianism (Inquisitor), or impersonal technological force (the Dynamo).",
        "All three prove that steam engines automatically produce moral progress and universal peace.",
        "All three urge readers to return to Greek blood-feuds.",
        "Pascal and Dostoevsky argued human beings are purely mechanical clocks."
      ],
      answer: 0,
      explanation: "Sublime synthesis! Spoken in December 1941, that triad explained the twentieth century's crisis better than a shelf of political science."
    },
    {
      id: "ex-8",
      category: "Closing the 2,400-Year Circle",
      prompt: "Compare Kafka's K. (The Castle) and Eliot's Harry (The Family Reunion) back to Aeschylus's Agamemnon: how does the seminar's final arc reimagine Fate?",
      humaneHint: "Think of K. striving amid static, and Harry turning around to face the Eumenides in the window!",
      options: [
        "Even when modern authority feels silent or labyrinthine (Kafka), ceasing to flee guilt in bad faith transforms Aeschylus's terrifying Furies from external doom into 'bright angels' of personal vocation (Eliot).",
        "Both Kafka and Eliot conclude that running away to an enchanted island solves every family curse.",
        "Eliot argues the Furies are merely indigestion cured by Horatian wine.",
        "Kafka's K. conquers the Castle by force and crowns himself Emperor like Peer Gynt."
      ],
      answer: 0,
      explanation: "Summa Cum Laude insight! From 458 BCE Argos to 1939 Wishwood, Fate stops being a blind cage the instant free conscience turns around and answers."
    }
  ],

  synthesisOptions: {
    classical: [
      { id: "syn-aeschylus", label: "Aeschylus's Agamemnon (Harness of Necessity)", theme: "cosmic boundary and ancestral Ate" },
      { id: "syn-antigone", label: "Sophocles' Antigone (Unwritten Law vs. Polis)", theme: "tragic collision between kinship piety and civic rationalism" },
      { id: "syn-horace", label: "Horace's Odes (Sabine Poise Against Fortuna)", theme: "dry stoic measure sheltering against capricious fortune" }
    ],
    pivot: [
      { id: "syn-augustine", label: "St. Augustine's Confessions (The Divided Will)", theme: "discovering bondage inside our own split desires rather than the stars" },
      { id: "syn-dante", label: "Dante's Divine Comedy (Ordered Love)", theme: "mapping Hell as stubborn self-choice and Purgatory as the healing of will" },
      { id: "syn-tempest", label: "Shakespeare's The Tempest (Broken Staff & Silent Antonio)", theme: "proving neither magic nor art can compel another free ego to forgive" },
      { id: "syn-pascal", label: "Pascal's Pensées (The Embarked Thinking Reed)", theme: "wagering responsibly across infinite silence instead of hiding in distraction" }
    ],
    opera: [
      { id: "syn-giovanni", label: "Mozart's Don Giovanni (Defiant Aesthetic 'No!')", theme: "pure sensual vitality confronting the marble voice of ethical judgment" },
      { id: "syn-fidelio", label: "Beethoven's Fidelio (Heroic Married Vow)", theme: "steadfast everyday fidelity unlocking tyranny's darkest dungeon" },
      { id: "syn-tristan", label: "Wagner's Tristan und Isolde (The Potion Alibi)", theme: "unmasking Romantic death-longing masquerading as irresistible fate" },
      { id: "syn-magicflute", label: "Mozart's Magic Flute (Tamino & Papageno)", theme: "marrying ethical trial through fire and water with humble creaturely joy" }
    ],
    modern: [
      { id: "syn-mobydick", label: "Melville's Moby-Dick (Ahab vs. Ishmael)", theme: "exposing defiant pride disguised as 'immutable decree' beside Queequeg's saving friendship" },
      { id: "syn-karamazov", label: "Dostoevsky's Brothers Karamazov (Grand Inquisitor)", theme: "refusing authoritarian comfort that confiscates moral freedom in exchange for bread" },
      { id: "syn-kafka", label: "Kafka's The Castle (Anxious Modern Quest)", theme: "persevering faithfully even when modern bureaucracy scrambles every summons" },
      { id: "syn-eliot", label: "Eliot's Family Reunion (Furies Turned Bright Angels)", theme: "turning around to accept responsibility until external Fate becomes inward Vocation" }
    ]
  }
};
