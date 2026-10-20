# Hospitalised Injuries from Road Crashes in Australia

## Project Overview

This project explores hospitalised road crash injuries in Australia between 2011 and 2021. We are developing an interactive website using D3.js to present national trends, differences across states and territories, and patterns in First Nations Peoples hospitalisation counts.

This repository contains our work in progress for COS30045 Data Visualisation.

## Team Members — Group 2

| Name | Student ID | Stand Up 1 Responsibilities |
|---|---|---|
| Wong Lin Yan | 105960329 | Project background, research questions and data sources |
| Lai Man Yee | 105996175 | KNIME data processing, validation and Section 2.2 |
| Dayaanan A/L Kejandran | 106212911 | Exploratory data analysis, GitHub and presentation compilation |

## Research Questions

1. How did the number of hospitalised road crash injuries in Australia change between 2011 and 2021?
2. How did hospitalisation counts and trends differ across Australian states and territories?
3. What patterns can be observed in hospitalisation counts reported for First Nations Peoples during this period?

## Data Sources

The project uses the September 2023 BITRE Hospitalised Injury release:

- National hospitalised injury workbook
- State and territory hospitalised injury workbook
- First Nations Peoples hospitalised injury workbook
- Hospitalised injury data dictionary

Source: https://www.bitre.gov.au/resource/road-safety/hospitalised-injury

Data dictionary: https://www.bitre.gov.au/sites/default/files/documents/hospitalised-injury-data-dictionary-september-2023.pdf

## Progress for Stand Up 1

- Defined the project scope and preliminary research questions.
- Selected the BITRE datasets and reviewed the supporting documentation.
- Completed three annotated data-processing branches in KNIME.
- Exported and validated three CSV files.
- Prepared initial exploratory analysis and charts.
- Drafted the design book and presentation materials.

Website implementation and usability testing remain upcoming work.

## Data Processing

### National Data

Filtered the raw data to retain records where Cause of injury is Traffic, then summed Hospitalisations by year.

### State and Territory Data

Selected the relevant source table and combined the two six-month periods into annual totals for each state and territory.

### First Nations Data

Used the published annual totals because some values in the raw age-group breakdown were suppressed as “n.p.”. Reshaped the population-group columns into rows for visualisation.

Suppressed values were not treated as zero.

## Processed Files

All three CSV files cover 2011–2021.

| File | Contents | Rows |
|---|---|---|
| national_annual_hospitalisations.csv | Annual national totals | 11 |
| state_annual_hospitalisations.csv | Annual totals for eight states and territories | 88 |
| first_nations_annual_hospitalisations.csv | Annual totals for First Nations peoples and Non-Indigenous Australians | 22 |

The exported files were checked against the corresponding source totals. No missing values or duplicate records were found in the exported datasets.

## KNIME Workflow

Workflow file: `Group 2_Road_Injury_Processing.knwf`

To use the workflow:

1. Download the `.knwf` file.
2. Import it into KNIME Analytics Platform.
3. Open the workflow and review the annotations.
4. Execute the workflow to regenerate the three CSV files.

The workflow package includes the three source workbooks, data dictionary and processed CSV files. File paths are relative to the workflow’s data folder.

## Important Data Limitations

- The datasets overlap and must not be added together.
- The exported values are counts, not population-adjusted rates. Higher counts do not automatically indicate higher individual injury risk.
- State and territory totals do not sum to the national total because the national figure includes cases with unrecorded or migratory/offshore residence.
- The two population-group totals exclude cases with unstated or inadequately described First Nations status.
- Reporting changes affect comparisons for Victoria from 2012 and New South Wales from June 2017.

## Next Steps

- Refine the exploratory analysis and chart designs.
- Develop the website layout and D3.js visualisations.
- Add suitable interactions and accessibility features.
- Check the website charts against the processed data.
- Conduct usability testing and document improvements.

## Tools

- KNIME Analytics Platform — data processing
- D3.js, HTML, CSS and JavaScript — planned website implementation
- GitHub — version control and collaboration
- Canva — presentation preparation

## Generative AI Declaration

Generative AI assistance is documented in Appendix A of the design book.
