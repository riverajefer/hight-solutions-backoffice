export const COMPANY_INFO = {
  name: 'High Solutions',
  address: 'Cra 28 #10-18',
  city: 'Bogotá D.C. / Colombia',
  phones: ['305 451 8018', '304 484 8835'],
  email: 'comercial1@hsgroup.com.co',
} as const;

export const PDF_COLORS = {
  headerBg: [26, 31, 61],       // dark navy
  headerText: [255, 255, 255],
  tableHeaderBg: [26, 107, 122], // teal
  tableHeaderText: [255, 255, 255],
  tableRowEven: [255, 255, 255],
  tableRowOdd: [232, 244, 246],  // light teal
  sectionTitleText: [26, 107, 122],
  borderGray: [224, 224, 224],
  totalRowBg: [240, 247, 248],
  bodyText: [40, 40, 40],
  footerText: [140, 140, 140],
} as const;

export const PDF_FONTS = {
  headerCompany: 16,
  headerDocTitle: 11,
  sectionTitle: 10,
  tableHeader: 8,
  tableBody: 8,
  label: 8,
  value: 9,
  totalLabel: 9,
  totalValue: 11,
  footer: 6.5,
} as const;

export const PDF_LAYOUT = {
  marginTop: 10,
  marginBottom: 22,
  marginLeft: 15,
  marginRight: 15,
  pageWidth: 210,
  pageHeight: 297,
  contentWidth: 180, // pageWidth - marginLeft - marginRight
  headerHeight: 38,
} as const;
