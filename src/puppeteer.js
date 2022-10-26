const puppeteer = require('puppeteer')
const login = require('./login')
const createRun = require('./createRun')
const logger = require('./logger')

module.exports = (config, callback) => {
  (async () => {
    console.log(config)
    logger('About to log', config.duration, 'hours')
    var start = 'https://tripletex.no/execute/login?site=no';
    let browser;
    try {
      browser = await puppeteer.launch({headless: false})
      const page = await browser.newPage()
      await page.setViewport({
        width: 1280,
        height: 800
      })
      // Log in.
      await page.goto(start);
      await page.evaluate(login, config.user, config.pass)
      await page.click('#loginButton')
      await page.waitForTimeout(1000)
      await page.evaluate(login, config.user, config.pass)
      await page.click('#loginButton')
      await page.waitForNavigation()
      await page.waitForTimeout(4000);
      // This crappy popup is in the way.
      await page.evaluate(function() {
        jQuery('.walkme-to-remove > button').click()
      })
      let keys = Object.keys(config.entries)
      keys = keys.reverse()
      for (const id of keys) {
        let entry = config.entries[id]
        await createRun(entry, page, config.dayOffset)
      }
      // Now check if everything was saved.
      await page.waitForTimeout(2000);
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
