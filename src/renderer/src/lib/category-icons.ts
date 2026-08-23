import {
  GraduationCap, BookOpen, Pencil, Library, Brain, Languages,
  Wallet, PiggyBank, CreditCard, Receipt, TrendingUp, DollarSign, Landmark,
  HeartPulse, Dumbbell, Apple, Pill, Stethoscope, Bed, Bath, Smile,
  Briefcase, Laptop, Presentation, Target, Handshake, Building2, Mail,
  House, Sofa, WashingMachine, Wrench, Hammer, Lightbulb, Trash2,
  ShoppingCart, ShoppingBag, Gift, Package,
  Gamepad2, Music, Clapperboard, Palette, Camera, Tv, Headphones,
  Plane, Car, Bus, Bike, MapPin, Luggage, Compass,
  Users, Heart, Baby, Dog, Cat, PartyPopper, Phone,
  Utensils, Coffee, Pizza, ChefHat,
  Code, Terminal, Database, Bug, GitBranch, Cpu,
  Calendar, Clock, Bell, Flag, Star, Bookmark, Tag, Folder,
  Leaf, Sun, Droplet, Flower2, TreePine,
  Church, Shield, Scale, FileText, Key, Sparkles,
  type LucideIcon
} from 'lucide-react'

/**
 * Biblioteca de icones oferecida ao usuario nas categorias.
 *
 * E uma selecao curada em vez do lucide inteiro (1500+): a lista fica navegavel
 * sem precisar saber o nome em ingles, e o bundle so carrega o que esta aqui —
 * importar a biblioteca toda impediria o tree-shaking.
 *
 * As chaves sao gravadas no banco (coluna `icon`), entao **nao renomeie uma chave
 * ja existente** sem migrar os dados; adicionar novas e sempre seguro.
 */

export interface IconOption {
  key: string
  icon: LucideIcon
  /** Termos de busca em pt-BR, ja que o nome do lucide e em ingles. */
  terms: string
}

export interface IconGroup {
  label: string
  icons: IconOption[]
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Educação',
    icons: [
      { key: 'graduation-cap', icon: GraduationCap, terms: 'formatura estudo faculdade escola' },
      { key: 'book-open', icon: BookOpen, terms: 'livro leitura estudo' },
      { key: 'pencil', icon: Pencil, terms: 'lapis escrever anotar' },
      { key: 'library', icon: Library, terms: 'biblioteca livros' },
      { key: 'brain', icon: Brain, terms: 'cerebro aprender memoria' },
      { key: 'languages', icon: Languages, terms: 'idioma lingua traducao ingles' }
    ]
  },
  {
    label: 'Financeiro',
    icons: [
      { key: 'wallet', icon: Wallet, terms: 'carteira dinheiro' },
      { key: 'piggy-bank', icon: PiggyBank, terms: 'cofre poupanca economia' },
      { key: 'credit-card', icon: CreditCard, terms: 'cartao credito pagamento' },
      { key: 'receipt', icon: Receipt, terms: 'recibo nota conta boleto' },
      { key: 'trending-up', icon: TrendingUp, terms: 'investimento grafico alta' },
      { key: 'dollar-sign', icon: DollarSign, terms: 'dinheiro real salario' },
      { key: 'landmark', icon: Landmark, terms: 'banco imposto governo' }
    ]
  },
  {
    label: 'Saúde e cuidado pessoal',
    icons: [
      { key: 'heart-pulse', icon: HeartPulse, terms: 'saude batimento coracao' },
      { key: 'dumbbell', icon: Dumbbell, terms: 'academia exercicio treino musculacao' },
      { key: 'apple', icon: Apple, terms: 'alimentacao fruta dieta' },
      { key: 'pill', icon: Pill, terms: 'remedio medicamento farmacia' },
      { key: 'stethoscope', icon: Stethoscope, terms: 'medico consulta exame' },
      { key: 'bed', icon: Bed, terms: 'dormir sono descanso' },
      { key: 'bath', icon: Bath, terms: 'banho higiene' },
      { key: 'smile', icon: Smile, terms: 'bem estar humor felicidade' }
    ]
  },
  {
    label: 'Trabalho',
    icons: [
      { key: 'briefcase', icon: Briefcase, terms: 'maleta trabalho emprego' },
      { key: 'laptop', icon: Laptop, terms: 'computador notebook' },
      { key: 'presentation', icon: Presentation, terms: 'apresentacao reuniao slide' },
      { key: 'target', icon: Target, terms: 'meta objetivo alvo' },
      { key: 'handshake', icon: Handshake, terms: 'acordo parceria cliente' },
      { key: 'building', icon: Building2, terms: 'empresa escritorio predio' },
      { key: 'mail', icon: Mail, terms: 'email correio mensagem' }
    ]
  },
  {
    label: 'Casa',
    icons: [
      { key: 'house', icon: House, terms: 'casa lar residencia' },
      { key: 'sofa', icon: Sofa, terms: 'movel sala estar' },
      { key: 'washing-machine', icon: WashingMachine, terms: 'lavar roupa maquina' },
      { key: 'wrench', icon: Wrench, terms: 'conserto manutencao reparo' },
      { key: 'hammer', icon: Hammer, terms: 'martelo obra reforma' },
      { key: 'lightbulb', icon: Lightbulb, terms: 'luz energia ideia' },
      { key: 'trash', icon: Trash2, terms: 'lixo limpeza' }
    ]
  },
  {
    label: 'Compras',
    icons: [
      { key: 'shopping-cart', icon: ShoppingCart, terms: 'carrinho mercado compras' },
      { key: 'shopping-bag', icon: ShoppingBag, terms: 'sacola loja compra' },
      { key: 'gift', icon: Gift, terms: 'presente aniversario' },
      { key: 'package', icon: Package, terms: 'encomenda entrega pacote' }
    ]
  },
  {
    label: 'Lazer',
    icons: [
      { key: 'gamepad-2', icon: Gamepad2, terms: 'jogo videogame games' },
      { key: 'music', icon: Music, terms: 'musica som cancao' },
      { key: 'clapperboard', icon: Clapperboard, terms: 'filme cinema serie' },
      { key: 'palette', icon: Palette, terms: 'arte pintura desenho hobby' },
      { key: 'camera', icon: Camera, terms: 'foto fotografia' },
      { key: 'tv', icon: Tv, terms: 'televisao serie streaming' },
      { key: 'headphones', icon: Headphones, terms: 'fone podcast audio' }
    ]
  },
  {
    label: 'Viagem e transporte',
    icons: [
      { key: 'plane', icon: Plane, terms: 'aviao voo viagem' },
      { key: 'car', icon: Car, terms: 'carro dirigir automovel' },
      { key: 'bus', icon: Bus, terms: 'onibus transporte publico' },
      { key: 'bike', icon: Bike, terms: 'bicicleta pedalar' },
      { key: 'map-pin', icon: MapPin, terms: 'local endereco mapa' },
      { key: 'luggage', icon: Luggage, terms: 'mala bagagem viagem' },
      { key: 'compass', icon: Compass, terms: 'bussola explorar direcao' }
    ]
  },
  {
    label: 'Pessoas',
    icons: [
      { key: 'users', icon: Users, terms: 'pessoas grupo equipe amigos' },
      { key: 'heart', icon: Heart, terms: 'amor relacionamento coracao' },
      { key: 'baby', icon: Baby, terms: 'bebe filho crianca' },
      { key: 'dog', icon: Dog, terms: 'cachorro pet animal' },
      { key: 'cat', icon: Cat, terms: 'gato pet animal' },
      { key: 'party-popper', icon: PartyPopper, terms: 'festa comemoracao evento' },
      { key: 'phone', icon: Phone, terms: 'telefone ligacao contato' }
    ]
  },
  {
    label: 'Alimentação',
    icons: [
      { key: 'utensils', icon: Utensils, terms: 'comida refeicao almoco jantar' },
      { key: 'coffee', icon: Coffee, terms: 'cafe bebida pausa' },
      { key: 'pizza', icon: Pizza, terms: 'lanche fast food' },
      { key: 'chef-hat', icon: ChefHat, terms: 'cozinhar receita chef' }
    ]
  },
  {
    label: 'Tecnologia',
    icons: [
      { key: 'code', icon: Code, terms: 'codigo programacao dev' },
      { key: 'terminal', icon: Terminal, terms: 'console comando shell' },
      { key: 'database', icon: Database, terms: 'banco dados sql' },
      { key: 'bug', icon: Bug, terms: 'erro bug correcao' },
      { key: 'git-branch', icon: GitBranch, terms: 'git branch versao' },
      { key: 'cpu', icon: Cpu, terms: 'hardware processador maquina' }
    ]
  },
  {
    label: 'Organização',
    icons: [
      { key: 'calendar', icon: Calendar, terms: 'agenda data calendario' },
      { key: 'clock', icon: Clock, terms: 'hora tempo prazo' },
      { key: 'bell', icon: Bell, terms: 'lembrete alarme aviso' },
      { key: 'flag', icon: Flag, terms: 'bandeira prioridade marco' },
      { key: 'star', icon: Star, terms: 'estrela favorito importante' },
      { key: 'bookmark', icon: Bookmark, terms: 'marcador salvar' },
      { key: 'tag', icon: Tag, terms: 'etiqueta rotulo categoria' },
      { key: 'folder', icon: Folder, terms: 'pasta arquivo organizar' }
    ]
  },
  {
    label: 'Outros',
    icons: [
      { key: 'leaf', icon: Leaf, terms: 'natureza folha planta meio ambiente' },
      { key: 'sun', icon: Sun, terms: 'sol dia clima' },
      { key: 'droplet', icon: Droplet, terms: 'agua gota beber' },
      { key: 'flower', icon: Flower2, terms: 'flor jardim planta' },
      { key: 'tree-pine', icon: TreePine, terms: 'arvore natureza floresta' },
      { key: 'church', icon: Church, terms: 'igreja fe religiao espiritual' },
      { key: 'shield', icon: Shield, terms: 'seguranca protecao seguro' },
      { key: 'scale', icon: Scale, terms: 'justica juridico advogado balanca' },
      { key: 'file-text', icon: FileText, terms: 'documento papel contrato' },
      { key: 'key', icon: Key, terms: 'chave senha acesso' },
      { key: 'sparkles', icon: Sparkles, terms: 'brilho especial novo' }
    ]
  }
]

/** Indice chave -> componente, para resolver o icone salvo no banco. */
const ICON_BY_KEY = new Map<string, LucideIcon>(
  ICON_GROUPS.flatMap((group) => group.icons.map((option) => [option.key, option.icon]))
)

export const DEFAULT_CATEGORY_ICON = Tag

/** Resolve o icone de uma categoria, caindo no padrao quando a chave e desconhecida. */
export function resolveCategoryIcon(key: string | null | undefined): LucideIcon {
  if (!key) return DEFAULT_CATEGORY_ICON
  return ICON_BY_KEY.get(key) ?? DEFAULT_CATEGORY_ICON
}

/** Filtra os grupos por nome ou por termos em pt-BR. Busca vazia devolve tudo. */
export function searchIcons(query: string): IconGroup[] {
  const term = query.trim().toLowerCase()
  if (!term) return ICON_GROUPS

  return ICON_GROUPS.map((group) => ({
    label: group.label,
    icons: group.icons.filter(
      (option) =>
        option.key.includes(term) ||
        option.terms.includes(term) ||
        group.label.toLowerCase().includes(term)
    )
  })).filter((group) => group.icons.length > 0)
}
