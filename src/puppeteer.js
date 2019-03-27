const puppeteer = require('puppeteer')
const login = require('./login')
const createRun = require('./createRun')
const logger = require('./logger')

module.exports = (config, callback) => {
  (async () => {
    logger('About to log', config.duration, 'hours')
    var start = 'https://tripletex.no/execute/login?site=no';
    let browser;
    try {
      browser = await puppeteer.launch({headless: false})
      const page = await browser.newPage()
      await page.setViewport({
        width: 1280,
        height: 600
      })
      // Log in.
      await page.goto(start);
      await page.evaluate(login, config.user, config.pass)
      await page.waitForNavigation()
      for (const id of Object.keys(config.entries)) {
        let entry = config.entries[id]
        await createRun(entry, page, config.dayOffset)
      }
      // Now check if everything was saved.
      let hours = await page.evaluate(function(dayOffset) {
        var day = new Date().getDay() - 1 - dayOffset;
        return parseFloat($($('tr.sum').find('.hourlistSum')[day]).text().replace(',', '.'));
      }, config.dayOffset);
      if (hours != config.duration) {
        console.log('Did not save all hours, unfortunately. I am a bad robot, sorry! Duration sent was ' + config.duration + '. Saved hours was ' + hours);
        throw new Error('PROBLEM!')
      }
      await browser.close()
      callback(null, [])
    }
    catch (err) {
      try {
        if (browser) {
          await browser.close()
        }
      }
      catch (anotherErr) {
        console.log('Could not close browser')
      }
      callback(err)
    }
  })()
}