import type { PriorityLevel, ProspectStatus } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";

export const VERTICAL_IDS = ["autoescuelas", "clinicas", "hoteles", "general_b2b"] as const;
export type VerticalId = (typeof VERTICAL_IDS)[number];

export const ORBITA_SERVICES = [
  "asistente_multicanal",
  "automatizacion_interna",
  "avatar_ia",
  "saas_a_medida",
] as const;

export type OrbitaService = (typeof ORBITA_SERVICES)[number];
export type OpportunityTier = "alta_oportunidad" | "media_oportunidad" | "baja_oportunidad";
export type UrgencyLevel = "alta" | "media" | "baja";
export type DemoBadgeTone = "cyan" | "emerald" | "amber" | "violet" | "slate";
export type MarketVerticalSource = "override" | "account" | "inferred";
export type ValueBand = "alto" | "medio" | "bajo";

export type ScoringConfig = {
  sectorFit: number;
  icpFit: number;
  offerFit: number;
  ticketFit: number;
  contactability: number;
  websiteGap: number;
  decisionMaker: number;
  prioritySignal: number;
  momentum: number;
  followUpUrgency: number;
  needSignal: number;
  potentialSignal: number;
};

export type CommercialPreferences = {
  preferredOutreach: "mixto" | "llamada_primero" | "email_primero";
  salesNarrative: "captacion" | "operacion" | "roi";
};

export type AccountCommercialSettings = {
  vertical: VerticalId;
  demoMode: boolean;
  scoringConfig: ScoringConfig;
  commercialPreferences: CommercialPreferences;
};

export type AccountKnowledgeSummary = {
  detectedServices: string[];
  detectedPainPoints: string[];
  detectedObjections: string[];
  detectedValueProps: string[];
  detectedTargetSegments: string[];
  sourceNote: string;
};

export type IdealCustomerProfile = {
  targetCustomer: string;
  targetGeographies: string[];
  bestFitCompanyTraits: string[];
  excludedCompanyTraits: string[];
};

export type OfferProfile = {
  whatYouSell: string;
  mainServices: string[];
  secondaryServices: string[];
  mainProblemSolved: string;
  valueProposition: string;
  typicalObjections: string[];
  preferredCta: string;
  salesStyle: string;
  reviewBeforeContact: string[];
  avoidTalkingPoints: string[];
  recommendedAngles: string[];
};

export type PricingProfile = {
  averagePriceRange: string;
  minimumDesiredTicket: string;
};

export type ProspectingPreferencesProfile = {
  preferredChannels: string[];
  focusPriorities: string[];
};

export type AccountCommercialProfile = {
  sector: string;
  targetVerticals: string[];
  targetSubsectors: string[];
  idealCustomerProfile: IdealCustomerProfile;
  offerProfile: OfferProfile;
  pricingProfile: PricingProfile;
  prospectingPreferences: ProspectingPreferencesProfile;
  knowledgeBaseText: string;
  knowledgeSummary: AccountKnowledgeSummary;
  onboardingCompleted: boolean;
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  value: number;
  max: number;
  reason: string;
  direction: "plus" | "minus";
};

export type ServiceRecommendation = {
  service: OrbitaService;
  label: string;
  shortLabel: string;
  fitLabel: "encaje alto" | "encaje medio" | "encaje bajo";
  reason: string;
  reasons: string[];
};

export type NextBestAction = {
  action: string;
  channel: string;
  reason: string;
  urgency: UrgencyLevel;
};

export type SuggestedMessages = {
  initial: string;
  followUp1: string;
  followUp2: string;
};

export type ObjectionResponse = {
  objection: string;
  response: string;
};

export type DemoBadge = {
  label: string;
  tone: DemoBadgeTone;
};

export type OpportunityAlertKind =
  | "follow_up_due"
  | "cooling_down"
  | "high_opportunity_untouched"
  | "high_value_pending"
  | "recent_priority"
  | "zone_underused"
  | "stalled_list";

export type OpportunityAlert = {
  id: string;
  kind: OpportunityAlertKind;
  title: string;
  summary: string;
  reason: string;
  actionLabel: string;
  urgency: UrgencyLevel;
  businessKey?: string;
  zoneKey?: string;
  zoneLabel?: string;
};

export type SectorPattern = {
  label: string;
  keywords: string[];
  pains: string[];
  serviceBias: Record<OrbitaService, number>;
};

export type VerticalConfig = {
  id: VerticalId;
  label: string;
  shortLabel: string;
  description: string;
  heroDescription: string;
  focusHeadline: string;
  scoringPreset: ScoringConfig;
  inferenceKeywords: string[];
  serviceBoosts: Record<OrbitaService, number>;
  sectorPatterns: SectorPattern[];
  genericPains: string[];
  objectionLibrary: ObjectionResponse[];
  messageHooks: {
    opening: string;
    differentiation: string;
    close: string;
  };
};

export type ProspectInsight = {
  score: number;
  tier: OpportunityTier;
  tierLabel: string;
  effectiveVertical: VerticalId;
  effectiveVerticalLabel: string;
  marketVertical: VerticalId;
  marketVerticalLabel: string;
  verticalSource: MarketVerticalSource;
  painPoint: string;
  commercialFocus: string;
  service: ServiceRecommendation;
  nextAction: NextBestAction;
  messages: SuggestedMessages;
  objections: ObjectionResponse[];
  breakdown: ScoreBreakdownItem[];
  executiveSummary: string;
  fitSummary: string;
  fitSignals: string[];
  riskSignals: string[];
  missingData: string[];
  reviewChecklist: string[];
  avoidTalkingPoints: string[];
  commercialAngle: string;
  ctaSuggestion: string;
  attackSummary: string;
  riskSummary: string;
  sectorLabel: string;
  cityLabel: string;
  estimatedValue: number;
  weightedValue: number;
  estimatedValueLabel: string;
  valueBand: ValueBand;
  closeProbability: number;
  daysSinceTouch: number | null;
  followUpAt: string | null;
  followUpDue: boolean;
  coolingDown: boolean;
  attentionLabel: string;
  isHot: boolean;
  needsFollowUp: boolean;
  dueToday: boolean;
  demoBadges: DemoBadge[];
};

export type ProspectRecord = {
  business: CombinedBusiness;
  insight: ProspectInsight;
};

export type TodayBuckets = {
  prioritizedToday: ProspectRecord[];
  followUpsPending: ProspectRecord[];
  hotLeads: ProspectRecord[];
  highPotentialUntouched: ProspectRecord[];
};

export type ConquestZoneSummary = {
  key: string;
  label: string;
  totalCount: number;
  workedCount: number;
  untouchedCount: number;
  openCount: number;
  highPotentialCount: number;
  hotLeadCount: number;
  weightedValue: number;
  averageScore: number;
  coveragePercent: number;
  topBusinessKey?: string;
  topBusinessName?: string;
};

export type ConquestSnapshot = {
  scopeLabel: string;
  totalCount: number;
  workedCount: number;
  untouchedCount: number;
  openCount: number;
  hotLeadCount: number;
  coveragePercent: number;
  weightedValue: number;
  estimatedValue: number;
  hotZones: ConquestZoneSummary[];
  underusedZones: ConquestZoneSummary[];
  liveZones: ConquestZoneSummary[];
  coverageNarrative: string[];
};

export type CommandCenterSummary = {
  prioritizedCount: number;
  hotCount: number;
  followUpCount: number;
  untouchedCount: number;
  staleCount: number;
  estimatedValueTotal: number;
  weightedValueTotal: number;
  serviceDistribution: Array<{ service: OrbitaService; label: string; value: number }>;
  marketVerticalDistribution: Array<{ vertical: VerticalId; label: string; value: number }>;
  sectorDistribution: Array<{ label: string; value: number }>;
  pipelineMoments: Array<{ label: string; value: number }>;
  actionSummary: string[];
  alerts: OpportunityAlert[];
  conquest: ConquestSnapshot;
};

export type AttackSessionSource =
  | "daily_queue"
  | "list"
  | "territory"
  | "priorities"
  | "pipeline"
  | "alerts"
  | "manual";

export type AttackSessionStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type AttackItemStatus = "pending" | "in_progress" | "worked" | "skipped" | "dismissed";

export type AttackResultKind =
  | "no_contactado"
  | "contacto_intentado"
  | "hablo_con_alguien"
  | "interesado"
  | "reunion_conseguida"
  | "propuesta_pendiente"
  | "no_encaja"
  | "perdido"
  | "volver_mas_tarde";

export type AttackQueueFilters = {
  city: string;
  vertical: VerticalId | "all";
  listId: string;
  service: OrbitaService | "all";
  urgency: UrgencyLevel | "all";
  zone: string;
  territoryOnly: boolean;
  followUpOnly: boolean;
};

export type AttackSessionFiltersSnapshot = {
  city: string;
  vertical: VerticalId | "all";
  listId: string;
  service: OrbitaService | "all";
  urgency: UrgencyLevel | "all";
  zone: string;
  territoryLabel?: string;
  sourceBusinessKey?: string;
};

export type AttackQueueEntry = ProspectRecord & {
  businessId: string;
  zoneKey: string;
  zoneLabel: string;
  queueReason: string;
  whyToday: string[];
  sessionItemId?: string;
  sessionItemStatus?: AttackItemStatus;
  pinnedForToday?: boolean;
  queuePosition?: number;
  listIds: string[];
  listNames: string[];
};

export type AttackResultOption = {
  id: AttackResultKind;
  label: string;
  description: string;
  tone: "neutral" | "amber" | "emerald" | "rose" | "violet";
};

export type AttackNextStepSuggestion = {
  label: string;
  reason: string;
  dueAt: string | null;
  nextStatus?: ProspectStatus;
  nextPriority?: PriorityLevel;
  moveToPipeline?: boolean;
  archive?: boolean;
};

export type AttackResultDraft = {
  result: AttackResultKind;
  noteText: string;
  followUpAt: string;
  priority: PriorityLevel | "";
  listId: string;
  moveToPipeline: boolean;
  discard: boolean;
  applySuggestion: boolean;
};

export type AttackSessionProgress = {
  total: number;
  worked: number;
  skipped: number;
  dismissed: number;
  pending: number;
  percent: number;
};

export type AttackSessionKpis = {
  workedToday: number;
  followUpsScheduled: number;
  meetingsUnlocked: number;
  discardedToday: number;
  workedValue: number;
  sessionAdvance: number;
  averagePaceMinutes: number | null;
};

export type PipelineStageSummary = {
  status: ProspectStatus;
  label: string;
  count: number;
  estimatedValue: number;
  weightedValue: number;
  averageScore: number;
  records: ProspectRecord[];
};

export type PipelineSnapshot = {
  stages: PipelineStageSummary[];
  openValue: number;
  weightedOpenValue: number;
  staleCount: number;
  followUpDueCount: number;
  closingSoon: ProspectRecord[];
  neglected: ProspectRecord[];
};

export type ProspectComputationInput = {
  business: CombinedBusiness;
  settings: AccountCommercialSettings;
  fallbackCity?: string;
};

export type StatusWeightMap = Partial<Record<ProspectStatus, number>>;
