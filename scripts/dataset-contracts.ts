/**
 * Explicit data contracts for NSI datasets that power custom dashboards.
 *
 * Each contract specifies what the dashboard expects to find in the processed
 * data (after localCsvLoader transforms it). Validation failures here mean
 * a dashboard would show "No data available" or broken KPI cards.
 *
 * Only datasets with custom visualizations need explicit contracts.
 * All other datasets are validated generically by validate-nsi-data.ts.
 */

export interface RequiredCodeCheck {
  column: string;
  values: string[];
  description: string;
}

export interface DatasetContract {
  /** Column names that must exist in processed rows */
  requiredColumns: string[];
  /** Specific code values that must be present in a column (for filters dashboards rely on) */
  requiredCodeValues?: RequiredCodeCheck[];
  /** The column + value that represents the national/total row (breaks KPI cards if missing) */
  nationalCode?: { column: string; value: string };
  /** Year column must match this regex (catches quarterly vs annual format mismatches) */
  temporalFormat?: RegExp;
  /**
   * Column containing week numbers (1–53) for weekly datasets.
   * Validation checks for `weekColumn` or `weekColumn + '_Code'` (either suffix form).
   */
  weekColumn?: string;
}

export const DATASET_CONTRACTS: Record<string, DatasetContract> = {

  // ── Demographics ─────────────────────────────────────────────────────────────

  // Population by districts, municipalities — PopulationByDistrictsDashboard
  '1169': {
    requiredColumns: ['Year', 'Population', 'EKATTE_Code', 'Residence_Code', 'Gender_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural — needed by all residence-split charts' },
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female — needed by gender charts' },
    ],
    nationalCode: { column: 'EKATTE_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Population by regions, age, residence, sex — PopulationDashboard
  '1942': {
    requiredColumns: ['Year', 'Population', 'NUTS_Code', 'Residence_Code', 'Gender_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural' },
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female' },
    ],
    nationalCode: { column: 'NUTS_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Live births — BirthsDashboard
  '1130': {
    requiredColumns: ['Year', 'LiveBirths', 'EKATTE_Code'],
    nationalCode: { column: 'EKATTE_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Deaths by district — VitalStatisticsDashboard
  '1139': {
    requiredColumns: ['Year', 'Deaths', 'EKATTE_Code'],
    nationalCode: { column: 'EKATTE_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Deaths by causes, age, sex — MortalityDashboard (NUTS-3 district data)
  '1678': {
    requiredColumns: ['Year', 'Deaths', 'NUTS_Code', 'Gender_Code'],
    requiredCodeValues: [
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female — needed by all gender-split charts' },
    ],
    nationalCode: { column: 'NUTS_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Deaths by weeks — WeeklyMortalityDashboard (massive dataset: ~1M rows)
  '1893': {
    requiredColumns: ['Year', 'Deaths', 'District_Projection_Code', 'Gender_Code', 'Ages_Code'],
    requiredCodeValues: [
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female — needed by KPI, seasonal, and demographic charts' },
      { column: 'Ages_Code', values: ['0'], description: 'total age — needed by KPI and seasonal trend charts' },
    ],
    nationalCode: { column: 'District_Projection_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
    weekColumn: 'weeks',
  },

  // Mortality rates by causes — MortalityRatesDashboard
  '1125': {
    requiredColumns: ['Year', 'Deaths', 'NUTS_Code', 'Gender_Code'],
    requiredCodeValues: [
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female' },
    ],
    nationalCode: { column: 'NUTS_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Marriages — MarriagesDashboard
  '818': {
    requiredColumns: ['Year', 'Marriages', 'EKATTE_Code', 'Residence_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural — needed by urban vs rural trend chart' },
    ],
    nationalCode: { column: 'EKATTE_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // Divorces — DivorcesDashboard
  '819': {
    requiredColumns: ['Year', 'Divorces', 'EKATTE_Code', 'Residence_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural' },
    ],
    nationalCode: { column: 'EKATTE_Code', value: 'BG' },
    temporalFormat: /^\d{4}$/,
  },

  // ── Employment ────────────────────────────────────────────────────────────────

  // Employed persons by residence and sex — EmployedByResidenceSexDashboard
  '1108': {
    requiredColumns: ['Year', 'Persons', 'Residence_Code', 'Gender_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural — needed by residence stacked chart' },
      { column: 'Gender_Code', values: ['0', '1', '2'], description: 'total/male/female — needed by gender trend and donut charts' },
    ],
    temporalFormat: /^\d{4}Q\d$/,
  },

  // Employees (wage earners) by residence — EmployeesByResidenceDashboard
  '1260': {
    requiredColumns: ['Year', 'Persons', 'Residence_Code'],
    requiredCodeValues: [
      { column: 'Residence_Code', values: ['0', '1', '2'], description: 'total/urban/rural — needed by all charts' },
    ],
    temporalFormat: /^\d{4}Q\d$/,
  },

  // Health establishments — HealthEstablishmentsDashboard
  '1206': {
    requiredColumns: ['Year', 'HlthEst_2011_2013_Code'],
    temporalFormat: /^\d{4}$/,
  },
};
