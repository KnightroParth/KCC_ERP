const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let pdf = require('html-pdf');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const getData = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const KCC_LOGO_PATH = path.join(__dirname, '../../public/uploads/setting/kcc-logo.png');

const pugFiles = ['invoice', 'offer', 'quote', 'payment'];

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result,
  callback
) => {
  try {
    const { targetLocation } = info;

    // if PDF already exists, then delete it and create a new PDF
    if (fs.existsSync(targetLocation)) {
      fs.unlinkSync(targetLocation);
    }

    // render pdf html

    if (pugFiles.includes(modelName.toLowerCase())) {
      // Compile Pug template

      const settings = await loadSettings();
      // Always use KCC logo on billing PDFs – embed as base64 so it loads without URL
      if (fs.existsSync(KCC_LOGO_PATH)) {
        const logoBase64 = fs.readFileSync(KCC_LOGO_PATH).toString('base64');
        settings.company_logo = 'data:image/png;base64,' + logoBase64;
      } else {
        settings.company_logo = 'public/uploads/setting/kcc-logo.png';
      }
      // KCC company block on all billing PDFs – always override so DB placeholders don’t show
      settings.company_name = 'Kothari Construction Company';
      settings.company_address = 'KCC-A-103, Rami Heritage, Opp. –Old Rto Office, Murtizapur Road, Akola -444001, Maharashtra, India';
      settings.company_address_lines = [
        'KCC-A-103, Rami Heritage, Opp. –Old Rto Office, Murtizapur Road, Akola -444001',
        'Maharashtra, India',
      ];
      settings.company_phone = '+919764999715';
      const selectedLang = settings['idurar_app_language'];
      const translate = useLanguage({ selectedLang });

      const {
        currency_symbol,
        currency_position,
        decimal_sep,
        thousand_sep,
        cent_precision,
        zero_format,
      } = settings;

      const { moneyFormatter } = useMoney({
        settings: {
          currency_symbol,
          currency_position,
          decimal_sep,
          thousand_sep,
          cent_precision,
          zero_format,
        },
      });
      const { dateFormat } = useDate({ settings });

      // For img src: base64 logo is used as-is; otherwise prepend server URL
      settings.public_server_file = settings.company_logo.startsWith('data:') ? '' : (process.env.PUBLIC_SERVER_FILE || '');

      let modelForPug = result;
      if (modelName.toLowerCase() === 'invoice') {
        const contractor = result.sourceContractorId || result.client;
        const hasDetails = contractor && typeof contractor === 'object' && contractor.name != null;
        const billTo = hasDetails
          ? {
              name: String(contractor.name || '-'),
              address: String(contractor.address ?? '-'),
              phone: String(contractor.phone ?? '-'),
              email: String(contractor.email ?? '-'),
            }
          : { name: '-', address: '-', phone: '-', email: '-' };
        modelForPug = result.toObject ? result.toObject() : { ...result };
        modelForPug.billTo = billTo;
      }

      const pugPath = path.join(__dirname, '../../pdf', modelName + '.pug');
      const htmlContent = pug.renderFile(pugPath, {
        model: modelForPug,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      pdf
        .create(htmlContent, {
          format: info.format,
          orientation: 'portrait',
          border: '10mm',
        })
        .toFile(targetLocation, function (error) {
          if (error) throw new Error(error);
          if (callback) callback();
        });
    }
  } catch (error) {
    throw new Error(error);
  }
};
