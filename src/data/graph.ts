import type { TNode, TEdge } from '../types/graph'
import { RELATIONAL_PREDICATES } from '../config/visuals'

export const TRAMA_GRAPH = {
  "@context": {
    "trama": "https://trama.edu/ontology#",
    "rdfs":  "http://www.w3.org/2000/01/rdf-schema#"
  },
  "@graph": [
    {
      "@id":   "trama:ClubRobotica",
      "@type": "trama:Club",
      "rdfs:label":          "Club de Robótica",
      "trama:description":   "Diseño y construcción de sistemas autónomos y robots de competencia.",
      "trama:tags":          ["hardware", "automatización", "mecatrónica"],
      "trama:founded":       "2022",
      "trama:alianzaCon":    ["trama:ClubIoT", "trama:ClubDiseno"],
      "trama:cubreTema":     ["trama:CursoSistemasEmbebidos"]
    },
    {
      "@id":   "trama:ClubIoT",
      "@type": "trama:Club",
      "rdfs:label":          "Club IoT",
      "trama:description":   "Conectividad inteligente: sensores, protocolos MQTT y hardware en red.",
      "trama:tags":          ["iot", "redes", "sensores", "embedded"],
      "trama:founded":       "2021",
      "trama:alianzaCon":    ["trama:ClubRobotica", "trama:ClubIA"],
      "trama:cubreTema":     ["trama:CursoRedes"]
    },
    {
      "@id":   "trama:ClubIA",
      "@type": "trama:Club",
      "rdfs:label":          "Club IA Aplicada",
      "trama:description":   "Aplicaciones prácticas de inteligencia artificial en problemas reales.",
      "trama:tags":          ["machine learning", "datos", "python", "visión"],
      "trama:founded":       "2023",
      "trama:alianzaCon":    ["trama:ClubIoT", "trama:ClubMediaLab"],
      "trama:cubreTema":     ["trama:CursoML"]
    },
    {
      "@id":   "trama:ClubDiseno",
      "@type": "trama:Club",
      "rdfs:label":          "Club de Diseño UX",
      "trama:description":   "Interfaces que respetan al usuario. Investigación, prototipado, testing.",
      "trama:tags":          ["ux", "ui", "diseño", "accesibilidad"],
      "trama:founded":       "2020",
      "trama:alianzaCon":    ["trama:ClubRobotica", "trama:ClubMediaLab"],
      "trama:cubreTema":     ["trama:CursoDisenoUX"]
    },
    {
      "@id":   "trama:ClubMediaLab",
      "@type": "trama:Club",
      "rdfs:label":          "Media Lab",
      "trama:description":   "Arte digital, instalaciones interactivas y tecnología creativa experimental.",
      "trama:tags":          ["arte", "digital", "generativo", "sonido"],
      "trama:founded":       "2021",
      "trama:alianzaCon":    ["trama:ClubIA", "trama:ClubDiseno"],
      "trama:cubreTema":     ["trama:CursoDisenoUX"]
    },
    {
      "@id":   "trama:CursoSistemasEmbebidos",
      "@type": "trama:Curso",
      "rdfs:label":        "Sistemas Embebidos",
      "trama:description": "Programación de microcontroladores, RTOS y periféricos de hardware.",
      "trama:ciclo":       "6"
    },
    {
      "@id":   "trama:CursoML",
      "@type": "trama:Curso",
      "rdfs:label":        "Machine Learning",
      "trama:description": "Fundamentos estadísticos y aplicaciones de aprendizaje automático.",
      "trama:ciclo":       "7"
    },
    {
      "@id":   "trama:CursoDisenoUX",
      "@type": "trama:Curso",
      "rdfs:label":        "Diseño UX/UI",
      "trama:description": "Metodologías de diseño centrado en el usuario y sistemas de diseño.",
      "trama:ciclo":       "5"
    },
    {
      "@id":   "trama:CursoRedes",
      "@type": "trama:Curso",
      "rdfs:label":        "Arquitectura de Redes",
      "trama:description": "Protocolos, capas OSI y diseño de infraestructura distribuida.",
      "trama:ciclo":       "5"
    },
    {
      "@id":   "trama:DocenteVargas",
      "@type": "trama:Docente",
      "rdfs:label":        "Prof. Vargas",
      "trama:area":        "Ingeniería de Control y Robótica",
      "trama:asesora":     ["trama:ClubRobotica", "trama:TesisRobot"]
    },
    {
      "@id":   "trama:DocenteMendez",
      "@type": "trama:Docente",
      "rdfs:label":        "Prof. Méndez",
      "trama:area":        "Ciencia de Datos y Aprendizaje Automático",
      "trama:asesora":     ["trama:ClubIA", "trama:TesisRedesNeuronales"]
    },
    {
      "@id":   "trama:DocenteTorres",
      "@type": "trama:Docente",
      "rdfs:label":        "Prof. Torres",
      "trama:area":        "Interacción Humano-Computadora",
      "trama:asesora":     ["trama:ClubDiseno", "trama:ProyectoTrama"]
    },
    {
      "@id":   "trama:TesisRobot",
      "@type": "trama:Tesis",
      "rdfs:label":        "Robot Autónomo Agrícola",
      "trama:description": "Sistema robótico para monitoreo y cosecha con visión computacional.",
      "trama:cita":        ["trama:CursoSistemasEmbebidos", "trama:CursoML"]
    },
    {
      "@id":   "trama:TesisRedesNeuronales",
      "@type": "trama:Tesis",
      "rdfs:label":        "Redes Neuronales en Tiempo Real",
      "trama:description": "Inferencia eficiente de modelos deep learning en hardware embebido.",
      "trama:cita":        ["trama:CursoML", "trama:CursoRedes"]
    },
    {
      "@id":   "trama:ProyectoTrama",
      "@type": "trama:Proyecto",
      "rdfs:label":        "Proyecto Trama",
      "trama:description": "Grafo de conocimiento vivo de la comunidad universitaria. Este mismo sistema.",
      "trama:cita":        ["trama:CursoDisenoUX"]
    }
  ]
}

export function processJSONLD(data: typeof TRAMA_GRAPH) {
  const nodeMap: Record<string, TNode> = {}
  const edges: TEdge[] = []

  for (const e of data['@graph']) {
    const ent = e as any
    nodeMap[ent['@id']] = {
      id: ent['@id'],
      type: ent['@type'] ?? 'trama:Club',
      label: ent['rdfs:label'] ?? ent['@id'],
      description: ent['trama:description'] ?? '',
      tags: ent['trama:tags'] ?? [],
      founded: ent['trama:founded'],
      area: ent['trama:area'],
      ciclo: ent['trama:ciclo'],
      x: 0, y: 0, vx: 0, vy: 0,
    }
  }

  const seen = new Set<string>()
  for (const e of data['@graph']) {
    const ent = e as any
    for (const pred of RELATIONAL_PREDICATES) {
      const refs: string[] = ent[pred] ?? []
      if (!refs.length) continue
      const predName = pred.replace('trama:', '')
      for (const tgtId of refs) {
        if (!nodeMap[tgtId]) continue
        const key = [ent['@id'], tgtId].sort().join('↔') + '|' + predName
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ source: ent['@id'], target: tgtId, predicate: predName, waveOff: Math.random() * Math.PI * 2 })
      }
    }
  }

  return { nodes: Object.values(nodeMap), edges }
}
