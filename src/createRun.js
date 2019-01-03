function createNewRow() {
  jQuery('#newRowButton').click()
}

function logger() {
  console.log(arguments)
}

async function clickDropdown(page, en, type, hasRow) {
  if (!hasRow) {
    console.log(type + ' dropdown ready. Trying to click')
    var delta = 1;
    if (type == 'activity') {
      delta = 3;
    }
    await page.evaluate(function(d) {
      $($($('.newWeeks')[0]).find('.tmdl-tlxSelect input')[d]).click();
    }, delta);
  }
}

function createSelector(en) {
  return 'td a[aria-label="' + en.id + ' ' + en.name + '"]';
}

function entryHasRow(en, selector) {
  var hasNext = false;
  jQuery(selector).each(function() {
    if ($(this).closest('td').next().text().trimLeft().indexOf(en.activity) === 0) {
      hasNext = true;
    }
  });
  return jQuery(selector).length > 0 && hasNext;
}

module.exports = async function(entry, page, dayOffset) {
  await page.waitForSelector('#newRowButton')
  let hasRow = await page.evaluate(entryHasRow, entry, createSelector(entry))
  let hasFirstRow = hasRow;
  if (!hasRow) {
    logger('Trying to insert a new row')
    await page.waitForSelector('#newRowButton')
    await page.evaluate(createNewRow)
  }
  await page.waitForFunction((hasRow) => {
    if (hasRow) {
      return true
    }
    return $($('.contentTable > .newWeeks')[0]).css('display') != 'none'
  }, {
    timeout: 10000
  }, hasRow)
  await clickDropdown(page, entry, 'project', hasRow)
  await page.waitForFunction((hasRow) => {
    if (hasRow) {
      return true
    }
    return $('.tlxSelectListTable tr').length > 0;
  }, {
    timeout: 10000
  }, hasRow)
  if (!hasRow) {
    await page.evaluate(function(id, name) {
      $('.tlxSelectListTable tr').each(function(i, n) {
        if ($(n).text().indexOf(id + ' ' + name) > -1) {
          $(n).find('span').click();
        }
      });
    }, entry.id, entry.name);
  }
  await clickDropdown(page, entry, 'activity', hasRow);
  await page.waitForFunction((hasRow) => {
    return hasRow || $('.tlxSelectListTable tr').length > 0
  }, {
    timeout: 10000
  }, hasRow)
  if (!hasRow) {
    if (entry.activity != 1) {
      logger('Will try to click on the activity list');
      // Add the activity requested. Unless it is 1 (default).
      await page.evaluate(function(activity) {
        $('.tlxSelectListTable tr').each(function(i, n) {
          if ($(n).text().indexOf(activity) === 0) {
            $(n).find('span').click();
          }
        });
      }, entry.activity);
    }
    else {
      logger('Using default activity, because activity is ' + entry.activity);
    }
    hasRow = true;
  }
  if (hasFirstRow) {
    var selector = createSelector(entry)
    await page.evaluate(function(selector, activity, dayOffset) {
      var delta = new Date().getDay() + 2 - dayOffset;
      var textInput;
      jQuery(selector).each(function(j, k) {
        if ($(k).closest('td').next().text().trimLeft().indexOf(activity) === 0) {
          window.textInput = $($(k).closest('tr').find('td')[delta]).find('input[type="text"]')
        }
      })
    }, selector, entry.activity, dayOffset);
  }
  else {
    await page.evaluate(function(dayOffset) {
      var delta = new Date().getDay() + 2 - dayOffset;
      window.textInput = $($($('.newWeeks')[0]).find('.hoursRow').find('td')[delta]).find('input[type="text"]')
    }, dayOffset);
  }

  let textDataSelector = 'text-selector-' + new Date().getTime();
  let areaDataSelector = 'area-selector-' + new Date().getTime();
  await page.evaluate(function(textDataSelector, areaDataSelector) {
    window.textInput.attr('data-text-selector', textDataSelector)
    window.areaInput = window.textInput.closest('tr').next().find('textarea')
    window.areaInput.attr('data-area-selector', areaDataSelector)
  }, textDataSelector, areaDataSelector);
  await page.click('[data-text-selector="' + textDataSelector + '"]')
  await page.evaluate(function (hours) {
    window.textInput.val(hours)
  }, entry.duration)
  await page.click('[data-area-selector="' + areaDataSelector + '"]')
  await page.evaluate(function (text) {
    window.areaInput.val(text)
  }, entry.text)
  await page.click('#ajaxContenttoolbarContainer button.storeAction')
  await page.waitForFunction(function() {
    return jQuery('.ui-widget-overlay.tlx-overlay').css('display') == 'none';
  });
}