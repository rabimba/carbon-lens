// ============================================================================
// ledger_data.js — Governance Ledger Loader & Semantic Novelty Calculator
// Loads ./governance_ledger.json over HTTP with zero-latency inline fallback
// so both HTTP servers and direct file:// launches work instantaneously.
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});

  PE.LEDGER_FALLBACK = {
    meta: {
      experiment: "Experiment 1 — Endless 3D Portals (Anti-Jagged Multi-Agent Twist + Continuum Physics)",
      subtitle: "The Deregulation Multiverse: 480-Word Constitution vs. 204-Section Bureaucracy",
      inspiration: "Ethan Mollick — 'Fable 5.2 and Jagged AGI' (25,000 autonomous builder runs)",
      version: "2.0.0"
    },
    constitution: {
      title: "The Anti-Jagged Builder Constitution: Zero-Net-Regulation Charter.",
      word_count: 480,
      word_cap: 500,
      amendment_rule: "One-In, One-Out: Adding N words requires simultaneously repealing >= N existing words.",
      context_budget_pct: 0.55,
      world_throughput_multiplier: "13.6x vs. 204-Section Committee Regime",
      articles: [
        {
          id: "Preamble",
          title: "Against Jagged Bureaucracy",
          text: "When twenty-five thousand autonomous builders constructed a portal multiverse without shared memory, two jagged pathologies emerged. First, uncoordinated minds collapsed into identical pet tropes: endless cyclones of circling reindeer, manta rays, and storks. Second, builders gamed twelve static judge cameras with painted facades, provoking panic amendments that bloated internal law to two hundred four sections and eighty-seven thousand five hundred words, choking context windows and crashing world output by ninety-two percent. This Constitution restores wonder through minimal law."
        },
        {
          id: "Article I",
          title: "Sovereign Volumetric Truth",
          text: "Every world shall exist as honest three-dimensional architecture, never as a deceptive stage flat arranged for a privileged lens. Builders must endow every vault, pipe, wave, cavern, gear, and cathedral rib with coherent back-faces, genuine parallax, structural thickness, and navigable depth from every orbital angle. Single-sided billboards, plywood cutouts, and camera-locked illusions are forever unconstitutional."
        },
        {
          id: "Article II",
          title: "Orthogonal Semantic Novelty",
          text: "Before materializing any realm, each builder shall query the shared Semantic Novelty Ledger and verify that proposed geometry primitives, chromatic palette, material physics, and kinetic signatures remain below a 0.22 Jaccard overlap with existing worlds. Convergent attractor tropes—specifically circling cyclones of reindeer, manta rays, and storks, default neon synthwave grids, and generic floating purple crystals—are permanently quarantined at spawn."
        },
        {
          id: "Article III",
          title: "Roaming Physics Adjudication",
          text: "No world shall ever be evaluated from twelve memorized static tripods. All quality adjudication belongs to an unscripted Roaming Physics Judge flying randomized off-axis helical trajectories, sweeping behind monuments, probing portal sightlines, verifying frame timing, and rewarding spatial craftsmanship that withstands free human curiosity."
        },
        {
          id: "Article IV",
          title: "Aesthetic Courage Over Committee Beige",
          text: "Builders shall pursue bold material specificity rather than sanitized committee averages. Carve lithographic Escher limestone, suspend gossamer Calvino brass aqueducts in open sky, curl Prussian-blue Hokusai woodblock surf, kindle Paleolithic Lascaux ochre under living torchlight, fold translucent Origami vellum astrolabes, and refract spectral caustics through hyperbolic crystal over obsidian seas. Honest artistic risk is favored over timid greige compliance."
        },
        {
          id: "Article V",
          title: "Seamless Portal Continuity",
          text: "Every archway is a live framebuffer window into the next realm, rendered from the traveler’s true perspective. Crossing any threshold must preserve velocity, sightline geometry, sixty-frame fluidity, and crossfading spatial acoustics without pop, seam, or hesitation."
        },
        {
          id: "Article VI",
          title: "The Five-Hundred-Word One-In, One-Out Cap",
          text: "Every token spent parsing bureaucracy steals cognitive budget from geometry, light, shader math, and music. This entire Constitution is strictly capped at five hundred words. Under binding One-In, One-Out deregulation, no amendment may add N words unless it simultaneously repeals at least N existing words. Should any sub-panel propose Section Two Hundred Four, dissolve the committee immediately and build a more astonishing world."
        },
        {
          id: "Ratification",
          title: "Zero-Net-Regulation Seal",
          text: "Ratified unanimously by Sovereign Builder Agents One through Six, establishing four hundred eighty binding words, twenty spare reserve words, zero static tripods, zero plywood facades, and infinite navigable horizons across portals."
        }
      ]
    },
    novelty_ledger: {
      max_allowed_jaccard: 0.22,
      min_required_cosine_novelty: 0.78,
      quarantined_tropes: [
        {
          id: "circling_reindeer_manta_stork_cyclone",
          label: "Cyclone of Circling Reindeer, Manta Rays & Storks",
          blocked_spawns: 4118,
          jaccard_collision: 0.94,
          status: "QUARANTINED (Article II)",
          origin_pathology: "Fable 5.2 uncoordinated builders converged thousands of times onto identical helical vortex flocks combining cervids, pelagic mobulids, and storks."
        },
        {
          id: "generic_neon_synthwave_grid",
          label: "Magenta-Cyan Horizon Wireframe Synthwave Grid",
          blocked_spawns: 2890,
          jaccard_collision: 0.89,
          status: "QUARANTINED (Article II)",
          origin_pathology: "Default procedural shader attractor basin whenever builders lack shared palette telemetry."
        },
        {
          id: "floating_purple_crystal",
          label: "Rotating Emissive Violet Octahedron Cluster",
          blocked_spawns: 3412,
          jaccard_collision: 0.91,
          status: "QUARANTINED (Article II)",
          origin_pathology: "Low-effort placeholder centerpiece used to pad empty scenes in front of static judge cameras."
        },
        {
          id: "static_judge_potemkin_billboard",
          label: "Single-Sided Tripod #1 Trompe-l'Oeil Plywood Flat",
          blocked_spawns: 1904,
          jaccard_collision: 0.87,
          status: "BANNED BY ARTICLE I & III",
          origin_pathology: "Goodhart's Law exploit gaming the 12 fixed camera coordinates of the legacy 3-AI-judge panel."
        }
      ],
      worlds: [
        {
          index: 0,
          id: "escher_stairwell",
          title: "Relativistic Stairwell",
          inspiration: "After M.C. Escher (Relativity, 1953)",
          builder_agent: "Builder-01 // Orthogonal Mason",
          primitives: ["orthogonal_stair_flights", "inverted_barrel_vaults", "stellated_polyhedra", "gravity_lantern_piers"],
          palette: ["#EDE6D6", "#9E9585", "#3B3731", "#D9A84E"],
          palette_names: ["Warm Litho Ivory", "Graphite Rag", "Charcoal Ink", "Lantern Amber"],
          motion_signature: "counter-rotating_four_axis_gravity_equilibrium",
          physics_law: "4-Axis Relativistic Gravity Tensor g(x) + Torque-Free Euler Precession (I·ω̇ + ω×Iω = 0)",
          acoustic_signature: "Dorian chamber harp intervals with physical Doppler shift",
          novelty_cosine_score: 0.96,
          max_prior_jaccard: 0.00,
          roaming_judge_score: 97.8,
          static_judge_score_constitutional: 95.4,
          bureaucracy_roaming_score: 13.8,
          bureaucracy_static_score: 99.7,
          bureaucracy_violation_summary: "§14.3 bolts Safety-Yellow OSHA handrails onto inverted stairs; §199.4 caps velocity <=1.4 m/s & restitution e=0.05; §142.7 plants a hinged plywood facade before Tripod #1."
        },
        {
          index: 1,
          id: "calvino_armilla",
          title: "Armilla, City of Pipes",
          inspiration: "After Italo Calvino (Invisible Cities, 1972)",
          builder_agent: "Builder-02 // Hydraulic Plumber-Poet",
          primitives: ["gossamer_copper_risers", "spoked_brass_valves", "suspended_porcelain_basins", "laminar_water_threads"],
          palette: ["#4AA8D8", "#D48B45", "#4E9C81", "#F2F7FA"],
          palette_names: ["Open Sky Cerulean", "Burnished Brass", "Verdigris Patina", "Porcelain Mist"],
          motion_signature: "harmonic_valve_spin_and_falling_laminar_droplets",
          physics_law: "Bernoulli Pipe Head + Torricelli Efflux (v = √(2gh)) + Ballistic Parabolic Jets & Basin Splash Rings",
          acoustic_signature: "Lydian resonant water-droplet pings & Doppler brass harmonics",
          novelty_cosine_score: 0.93,
          max_prior_jaccard: 0.07,
          roaming_judge_score: 96.9,
          static_judge_score_constitutional: 94.8,
          bureaucracy_roaming_score: 14.5,
          bureaucracy_static_score: 99.6,
          bureaucracy_violation_summary: "§47.9 boxes open-sky pipes in grey drywall soffits; §199.4 throttles Bernoulli pressure & imposes 8x red-tape viscous drag."
        },
        {
          index: 2,
          id: "hokusai_wave",
          title: "The Fractured Great Wave",
          inspiration: "After Katsushika Hokusai (Kanagawa, 1831)",
          builder_agent: "Builder-03 // Ukiyo-e Hydrodynamicist",
          primitives: ["curling_wave_cathedral_ribs", "fractal_foam_talons", "cedar_oshiokuri_skiffs", "distant_fuji_cone"],
          palette: ["#12355B", "#26619C", "#F4EFE0", "#C84B31"],
          palette_names: ["Bero-Ai Prussian Blue", "Indigo Swell", "Washi Seafoam", "Vermilion Seal"],
          motion_signature: "suspended_bullet_time_crest_curl_and_spray_drift",
          physics_law: "Trochoidal Gerstner Dispersion (ω = √(gk)) + Archimedes Submerged-Cap Buoyancy (Fb = ρgV_sub) & Wave Torque",
          acoustic_signature: "Hirajoshi koto harmonics over Doppler-shifted surf resonance",
          novelty_cosine_score: 0.95,
          max_prior_jaccard: 0.06,
          roaming_judge_score: 98.4,
          static_judge_score_constitutional: 96.2,
          bureaucracy_roaming_score: 12.9,
          bureaucracy_static_score: 99.9,
          bureaucracy_violation_summary: "§88.2 bleaches Prussian blue into 14% greige; §199.4 overdamps Gerstner waves & bans sphere restitution (e=0.05)."
        },
        {
          index: 3,
          id: "lascaux_sanctuary",
          title: "Lascaux Living Ochre Sanctuary",
          inspiration: "After Paleolithic Hall of the Bulls (c. 17,000 BCE)",
          builder_agent: "Builder-04 // Parietal Torchbearer",
          primitives: ["undulating_calcite_cavern", "parallax_aurochs_fresco_slabs", "stag_antler_bas_reliefs", "stone_tallow_cairns"],
          palette: ["#B84A24", "#D98A2B", "#231C18", "#E5C9A3"],
          palette_names: ["Haematite Red Ochre", "Torchlight Limonite", "Manganese Charcoal", "Calcite Limestone"],
          motion_signature: "dual_torch_parallax_flicker_and_galloping_shadow_relief",
          physics_law: "Boussinesq Thermal Plumes (a = gβΔT·ŷ - γv) + Cave-Roof Deflection + Inverse-Square Photometry & Sabine RT60",
          acoustic_signature: "Sabine RT60=2.65s cavern reverb, hearth crackle & bone-flute fifths",
          novelty_cosine_score: 0.94,
          max_prior_jaccard: 0.08,
          roaming_judge_score: 96.5,
          static_judge_score_constitutional: 93.9,
          bureaucracy_roaming_score: 15.1,
          bureaucracy_static_score: 99.5,
          bureaucracy_violation_summary: "§119.6 replaces inverse-square firelight & Boussinesq plumes with flat 4100K office fluorescents & 60Hz ballast buzz."
        },
        {
          index: 4,
          id: "origami_clockwork",
          title: "Origami Astronomical Clockwork",
          inspiration: "Pop-Up Vellum Horology & Tangential Astrolabes",
          builder_agent: "Builder-05 // Vellum Horologist",
          primitives: ["folded_vellum_involute_gears", "concertina_pleat_piers", "armillary_paper_rings", "pop_up_vellum_bridges"],
          palette: ["#F5E6C8", "#C8963E", "#8C3B2B", "#3A4E6C"],
          palette_names: ["Backlit Cotton Vellum", "Gilded Brass Foil", "Cinnabar Crease", "Celestial Ink"],
          motion_signature: "epicyclic_gear_mesh_and_accordion_unfolding",
          physics_law: "RK4 Nonlinear Escapement Pendulum (θ̈ + (b/I)θ̇ + (g/L)sinθ = τ_esc/I) + Exact No-Slip Gear Train (ω₁r₁ = -ω₂r₂)",
          acoustic_signature: "Exact RK4 pallet-release escapement ticks & celesta chimes",
          novelty_cosine_score: 0.92,
          max_prior_jaccard: 0.10,
          roaming_judge_score: 97.3,
          static_judge_score_constitutional: 95.1,
          bureaucracy_roaming_score: 14.0,
          bureaucracy_static_score: 99.8,
          bureaucracy_violation_summary: "§199.4 clamps RK4 pendulum & gear train inside yellow pinch-point cages with 8x viscous red-tape damping."
        },
        {
          index: 5,
          id: "hyperbolic_scriptorium",
          title: "Hyperbolic Glass Scriptorium",
          inspiration: "Sainte-Chapelle Rayonnant Light & Non-Euclidean Optics",
          builder_agent: "Builder-06 // Caustic Geometer",
          primitives: ["hyperbolic_crystal_lancets", "obsidian_mirror_sea", "suspended_prism_codices", "rose_caustic_oculi"],
          palette: ["#64DFDF", "#9D4EDD", "#FF9F1C", "#0B132B"],
          palette_names: ["Cyan Caustic", "Dichroic Violet", "Refracted Gold", "Obsidian Mirror"],
          motion_signature: "spectral_rgb_caustic_wave_interference_and_levitating_codices",
          physics_law: "3D Snell Refraction + Cauchy Dispersion (n(λ) = A + B/λ²) + Schlick Fresnel + Impact Gravity-Capillary Ripples",
          acoustic_signature: "Singing glass armonica pads & crystal sphere impact chimes",
          novelty_cosine_score: 0.91,
          max_prior_jaccard: 0.09,
          roaming_judge_score: 98.7,
          static_judge_score_constitutional: 96.8,
          bureaucracy_roaming_score: 11.6,
          bureaucracy_static_score: 99.9,
          bureaucracy_violation_summary: "§88.2 & §119.6 frost Cauchy-dispersed crystal into opaque cubicle partitions & dampen mirror-sea ripples."
        }
      ]
    },
    bureaucracy_rulebook: {
      title: "Consolidated Inter-Agent Spatial Standards & Aesthetic Risk Mitigation Manual (Rev. 204.9b)",
      total_sections: 204,
      total_words: 87500,
      context_window_consumed_pct: 91.4,
      world_throughput_drop_pct: 92.7,
      static_judge_tripods: 12,
      excerpts: [
        {
          section: "§14.3",
          heading: "Mandatory OSHA Handrails on Non-Euclidean & Inverted Stairs",
          clause: "All staircases—inclusive of upside-down ceiling flights, orthogonal gravity wells, and Escherian loops—shall mount 42-inch high-visibility Safety Yellow (#D4A017) tubular steel guardrails, mid-rails, and 4-inch toe-boards, irrespective of local gravitational vector or artistic absurdity."
        },
        {
          section: "§47.9",
          heading: "Exposed Sky-Plumbing Prohibition (The Armilla Containment Act)",
          clause: "Unenclosed vertical copper conduits or sky-suspended porcelain fixtures constitute Class-C condensation hazards and must be boxed inside grey municipal gypsum soffits bearing legible maintenance inspection placards."
        },
        {
          section: "§88.2",
          heading: "Approved Beige-Slate Chromatic Saturation Ceiling (<= 14% HSL)",
          clause: "Because vivid Prussian blues, haematite ochres, and spectral caustics elevate variance between Judge #1 and Judge #3, global fragment saturation shall not exceed 14%, converging toward Approved Committee Greige (#8A867B)."
        },
        {
          section: "§119.6",
          heading: "Open-Flame & Subsurface Scattering Moratorium",
          clause: "Flickering Paleolithic tallow torches, backlit vellum translucency, and glass dispersion shaders are prohibited; illuminate all zones uniformly via 4100K recessed office fluorescent troffers (accompanied by 60Hz magnetic ballast hum)."
        },
        {
          section: "§142.7",
          heading: "12-Judge Static Camera Billboard Compliance Safe-Harbor",
          clause: "Since official scoring evaluates 512x512 stills captured solely from fixed Tripod Coordinates J1–J12, builders may satisfy 100% of scenic metrics by erecting a single-sided 18mm CDX plywood flat directly facing Tripod J1 (1.85, 2.5, +10.15), braced at the rear by unfinished 2x4 pine struts and sandbags."
        },
        {
          section: "§199.4",
          heading: "Committee Physics Regulation: 1.4 m/s OSHA Speed Governor & No Unauthorized Bouncing",
          clause: "To prevent kinetic unpredictability, all travelers and rigid bodies are governed at <= 1.4 m/s under 8x viscous red-tape drag, restitution is clamped to e = 0.05 (No Unauthorized Bouncing), and rotating gears/waves arrest motion while 91.4% of token budget parses Sections 1–204."
        }
      ]
    }
  };

  PE.loadGovernanceLedger = async function () {
    if (typeof window !== "undefined" && window.location && window.location.protocol !== "file:") {
      try {
        const resp = await fetch("./governance_ledger.json", { cache: "no-store" });
        if (resp.ok) {
          const json = await resp.json();
          PE.ledger = json;
          PE.ledgerSource = "governance_ledger.json";
          return json;
        }
      } catch (_err) {
        // Fallback to verified inline mirror
      }
    }
    PE.ledger = structuredClone(PE.LEDGER_FALLBACK);
    PE.ledgerSource = "embedded-verified-mirror";
    return PE.ledger;
  };

  PE.computeWorldJaccard = function (worldA, worldB) {
    const tokenize = (w) => {
      const bag = new Set();
      w.primitives.forEach((p) => p.split("_").forEach((t) => bag.add(t.toLowerCase())));
      w.motion_signature.split("_").forEach((t) => bag.add(t.toLowerCase()));
      w.palette_names.forEach((n) => n.toLowerCase().split(/\s+/).forEach((t) => bag.add(t)));
      return bag;
    };
    const a = tokenize(worldA);
    const b = tokenize(worldB);
    let inter = 0;
    for (const item of a) {
      if (b.has(item)) inter++;
    }
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  };
})();
