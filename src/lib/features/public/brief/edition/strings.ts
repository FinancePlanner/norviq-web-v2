// The editorial brief's own strings, en and pt-PT, resolved on the server.
//
// Not in #lib/i18n/pt-PT.json on purpose: that dictionary ships to the
// browser on every route, and these strings are only ever needed to render
// /brief pages, which receive them already resolved in their page data.

/** The Export Studio's strings (ExportTrigger + ExportStudio), part of EditionStrings. */
export interface ExportStrings {
	exportOpen: string;
	exportTitle: string;
	exportSocial: string;
	exportStory: string;
	exportPdf: string;
	exportLink: string;
	exportDownload: string;
	exportShare: string;
	exportOpenPdf: string;
	/** "%d" is replaced by the page count. */
	exportPages: string;
	/** The page count when it is 1. */
	exportOnePage: string;
	exportCopyLink: string;
	exportCopied: string;
	exportUnavailable: string;
	exportClose: string;
	exportSocialAlt: string;
	exportStoryAlt: string;
	exportLinkAlt: string;
}

export interface EditionStrings extends ExportStrings {
	marketIntelligence: string;
	theOpen: string;
	theClose: string;
	previousEdition: string;
	latestEdition: string;
	moreBriefs: string;
	home: string;
	dashboard: string;
	signIn: string;
	signUp: string;
	published: string;
	marketDataAsOf: string;
	lisbonTime: string;
	edition: string;
	revision: string;
	limitedSources: string;
	marketsAtAGlance: string;
	glanceNote: string;
	marketPerformance: string;
	chartTitleClose: string;
	chartTitleOpen: string;
	showChartData: string;
	time: string;
	leadStory: string;
	developmentsClose: string;
	developmentsOpen: string;
	source: string;
	whatToWatch: string;
	earningsToday: string;
	context: string;
	acrossAssetClasses: string;
	instrument: string;
	level: string;
	change: string;
	rates: string;
	commodities: string;
	asia: string;
	intradayChart: string;
	quote: string;
	sourcesAndMethodology: string;
	citedSources: string;
	marketData: string;
	marketDataMethod: string;
	howWritten: string;
	howWrittenBody: string;
	degradedBody: string;
	notAvailable: string;
	legacyNote: string;
	disclaimer: string;
	shareThisEdition: string;
	ctaTitle: string;
	ctaBody: string;
	ctaButton: string;
	terms: string;
	privacy: string;
	/** Display names by catalog symbol. */
	names: Record<string, string>;
}

const en: EditionStrings = {
	marketIntelligence: 'Market Intelligence',
	theOpen: 'The Open',
	theClose: 'The Close',
	previousEdition: 'Previous edition',
	latestEdition: 'Latest edition',
	moreBriefs: 'More market briefs',
	home: 'Norviq home',
	dashboard: 'Dashboard',
	signIn: 'Sign in',
	signUp: 'Sign up',
	published: 'Published',
	marketDataAsOf: 'Market data as of',
	lisbonTime: '(Lisbon time)',
	edition: 'Edition',
	revision: 'Revision',
	limitedSources: 'Limited sources',
	marketsAtAGlance: 'Markets at a glance',
	glanceNote: 'Moves from the previous close. Times are Lisbon time.',
	marketPerformance: 'Market performance',
	chartTitleClose: 'US session, from the previous close',
	chartTitleOpen: 'Overnight and early trading, from the previous close',
	showChartData: 'Show chart data',
	time: 'Time',
	leadStory: 'Lead story',
	developmentsClose: 'Market-moving developments',
	developmentsOpen: 'Also this morning',
	source: 'Source',
	whatToWatch: 'What to watch',
	earningsToday: 'Earnings today',
	context: 'Context',
	acrossAssetClasses: 'Across asset classes',
	instrument: 'Instrument',
	level: 'Level',
	change: 'Change',
	rates: 'Rates',
	commodities: 'Commodities',
	asia: 'Asia',
	intradayChart: 'intraday chart',
	quote: 'quote',
	sourcesAndMethodology: 'Sources and methodology',
	citedSources: 'Cited sources',
	marketData: 'Market data',
	marketDataMethod:
		'Index levels and moves are computed by Norviq from Yahoo Finance quotes at publication time. Quotes may be delayed.',
	howWritten: 'How this edition is written',
	howWrittenBody:
		'An AI model writes the text from those numbers and from recent news. A sentence that uses news names its source. Levels, prices and percentages in a sentence without a source were checked against the figures the model was given (market data, headlines and earnings), and sentences that failed the check were removed. The check does not prove a sentence true, only that its figures were in the data.',
	degradedBody:
		'Web sources were unavailable for this edition, so it was written from in-house data only.',
	notAvailable: 'Not available in this edition',
	legacyNote: 'This edition predates detailed market data, so it shows only the published levels.',
	disclaimer: 'AI-written from market data. Not financial advice.',
	shareThisEdition: 'Share this edition',
	ctaTitle: 'Follow the markets with Norviq',
	ctaBody:
		'The brief is on your Norviq dashboard every weekday morning and evening, next to your portfolio.',
	ctaButton: 'Create free account',
	terms: 'Terms',
	privacy: 'Privacy',
	exportOpen: 'Export & share',
	exportTitle: 'Export this edition',
	exportSocial: 'Social',
	exportStory: 'Story',
	exportPdf: 'PDF report',
	exportLink: 'Link',
	exportDownload: 'Download',
	exportShare: 'Share',
	exportOpenPdf: 'Open PDF',
	exportPages: '%d pages',
	exportOnePage: '1 page',
	exportCopyLink: 'Copy link',
	exportCopied: 'Copied',
	exportUnavailable: 'This export is unavailable right now. Try again shortly.',
	exportClose: 'Close',
	exportSocialAlt: 'Social image of this edition, 1080 × 1350',
	exportStoryAlt: 'Story image of this edition, 1080 × 1920',
	exportLinkAlt: 'Link preview image, 1200 × 630',
	names: {
		'^GDAXI': 'DAX',
		'^FCHI': 'CAC 40',
		'^STOXX50E': 'Euro Stoxx 50',
		'NQ=F': 'Nasdaq 100 futures',
		'ES=F': 'S&P 500 futures',
		'^NDX': 'Nasdaq 100',
		'^GSPC': 'S&P 500',
		'^DJI': 'Dow Jones',
		'^N225': 'Nikkei 225',
		'^HSI': 'Hang Seng',
		'BZ=F': 'Brent crude',
		'^TNX': 'US 10-year Treasury yield'
	}
};

const pt: EditionStrings = {
	marketIntelligence: 'Market Intelligence',
	theOpen: 'A Abertura',
	theClose: 'O Fecho',
	previousEdition: 'Edição anterior',
	latestEdition: 'Edição mais recente',
	moreBriefs: 'Mais resumos de mercado',
	home: 'Página inicial do Norviq',
	dashboard: 'Painel',
	signIn: 'Entrar',
	signUp: 'Inscrever-se',
	published: 'Publicado',
	marketDataAsOf: 'Dados de mercado às',
	lisbonTime: '(hora de Lisboa)',
	edition: 'Edição',
	revision: 'Revisão',
	limitedSources: 'Fontes limitadas',
	marketsAtAGlance: 'Mercados num relance',
	glanceNote: 'Variações face ao fecho anterior. Horas de Lisboa.',
	marketPerformance: 'Desempenho do mercado',
	chartTitleClose: 'Sessão americana, face ao fecho anterior',
	chartTitleOpen: 'Negociação noturna e início da sessão, face ao fecho anterior',
	showChartData: 'Mostrar dados do gráfico',
	time: 'Hora',
	leadStory: 'Destaque',
	developmentsClose: 'O que mexeu com os mercados',
	developmentsOpen: 'Também esta manhã',
	source: 'Fonte',
	whatToWatch: 'A acompanhar',
	earningsToday: 'Resultados hoje',
	context: 'Contexto',
	acrossAssetClasses: 'Entre classes de ativos',
	instrument: 'Instrumento',
	level: 'Nível',
	change: 'Variação',
	rates: 'Taxas de juro',
	commodities: 'Matérias-primas',
	asia: 'Ásia',
	intradayChart: 'gráfico intradiário',
	quote: 'cotação',
	sourcesAndMethodology: 'Fontes e metodologia',
	citedSources: 'Fontes citadas',
	marketData: 'Dados de mercado',
	marketDataMethod:
		'Os níveis e as variações dos índices são calculados pelo Norviq a partir das cotações da Yahoo Finance no momento da publicação. As cotações podem ter atraso.',
	howWritten: 'Como esta edição é escrita',
	howWrittenBody:
		'Um modelo de IA escreve o texto a partir desses números e de notícias recentes. Uma frase que usa notícias indica a fonte. Níveis, preços e percentagens numa frase sem fonte foram verificados com os números dados ao modelo (dados de mercado, títulos de notícias e resultados), e as frases que falharam a verificação foram removidas. A verificação não prova que a frase é verdadeira, apenas que os seus números estavam nos dados.',
	degradedBody:
		'As fontes web não estavam disponíveis para esta edição, por isso foi escrita apenas com dados internos.',
	notAvailable: 'Indisponível nesta edição',
	legacyNote:
		'Esta edição é anterior aos dados de mercado detalhados, por isso mostra apenas os níveis publicados.',
	disclaimer:
		'Escrito por IA a partir de dados de mercado. Não constitui aconselhamento financeiro.',
	shareThisEdition: 'Partilhar esta edição',
	ctaTitle: 'Acompanhe os mercados com o Norviq',
	ctaBody:
		'O resumo está no seu painel do Norviq todas as manhãs e noites dos dias úteis, ao lado da sua carteira.',
	ctaButton: 'Criar conta gratuita',
	terms: 'Termos',
	privacy: 'Privacidade',
	exportOpen: 'Exportar e partilhar',
	exportTitle: 'Exportar esta edição',
	exportSocial: 'Redes sociais',
	exportStory: 'Story',
	exportPdf: 'Relatório PDF',
	exportLink: 'Ligação',
	exportDownload: 'Transferir',
	exportShare: 'Partilhar',
	exportOpenPdf: 'Abrir PDF',
	exportPages: '%d páginas',
	exportOnePage: '1 página',
	exportCopyLink: 'Copiar ligação',
	exportCopied: 'Copiado',
	exportUnavailable:
		'Esta exportação não está disponível de momento. Tente novamente dentro de instantes.',
	exportClose: 'Fechar',
	exportSocialAlt: 'Imagem para redes sociais desta edição, 1080 × 1350',
	exportStoryAlt: 'Imagem vertical (story) desta edição, 1080 × 1920',
	exportLinkAlt: 'Imagem de pré-visualização da ligação, 1200 × 630',
	names: {
		...en.names,
		'NQ=F': 'Futuros do Nasdaq 100',
		'ES=F': 'Futuros do S&P 500',
		'BZ=F': 'Petróleo Brent',
		'^TNX': 'Yield do Tesouro dos EUA a 10 anos'
	}
};

export function editionStrings(lang: string): EditionStrings {
	return lang === 'pt-PT' ? pt : en;
}
