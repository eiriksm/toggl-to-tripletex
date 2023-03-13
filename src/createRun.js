const logger = require('./logger')

function createNewRow() {
  jQuery('#newRowButton').click()
}

async function clickDropdown(page, en, type, hasRow) {
  if (!hasRow) {
    logger(type + ' dropdown ready. Trying to click')
    var delta = 0;
    if (type == 'activity') {
      delta = 1;
    }
    await page.evaluate(function(d) {
      $($($('.newWeeks')[0]).find('.tlx-dropdown__react-container .txr-dropdown__field__input')[d]).click();
    }, delta);
    await page.waitForTimeout(1000);
  }
}

function createSelector(en) {
  if (!en.id && !en.name) {
    return 'td'
  }
  return 'td a[aria-label="' + en.id + ' ' + en.name + '"]';
}

function entryHasRow(en, selector) {
  var hasNext = false;
  jQuery(selector).each(function() {
    if ($(this).closest('td').next().text().trimLeft().indexOf(en.activity + ' ') === 0) {
      hasNext = true;
    }
  });
  return jQuery(selector).length > 0 && hasNext;
}

module.exports = async function(entry, page, dayOffset) {
  // Start by just clicking in the body area.
  await page.evaluate(function() {
    jQuery('body').click()
  });
  logger(entry.duration + ' hours: Creating run for project name ' + entry.name + ' and text ' + entry.text)
  logger('Activity is ' + entry.activity)
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
    return $('.txr-dropdown__search-container .txr-dropdown__search-result').length > 0;
  }, {
    timeout: 10000
  }, hasRow)
  if (!hasRow) {
    var a = 'b'
    await page.evaluate(function(id, name) {
      var text = id + ' ' + name;
      var selector = '.txr-dropdown__search-container .txr-dropdown__search-result .txr-dropdown__item-cell--description'
      if (!id && !name) {
        text = '(Ikke valgt)';
        selector = '.txr-dropdown__search-container .txr-dropdown__search-result .txr-dropdown__item-cell--default'
      }
      $(selector).each(function(i, n) {
        if ($(n).text().indexOf(text) > -1) {
          $(n).click();
        }
      });
    }, entry.id, entry.name);
  }
  if (!hasRow) {
    let activityIsSelected = await page.evaluate(function(activity) {
      return $($($('.newWeeks')[0]).find('.tlx-dropdown__react-container .txr-dropdown__field__input')[1]).text().indexOf(activity + ' ') === 0;
    }, entry.activity);
    if (!activityIsSelected) {
      await clickDropdown(page, entry, 'activity', hasRow);
      await page.waitForFunction((hasRow) => {
        return $('.txr-dropdown__search-container .txr-dropdown__search-result .txr-dropdown__list-item__text').length > 0;
      }, {
        timeout: 10000
      }, hasRow)
      logger('Will try to click on the activity list');
      // Add the activity requested.
      await page.evaluate(function(activity) {
        $('.txr-dropdown__search-container .txr-dropdown__search-result .txr-dropdown__list-item__text').each(function(i, n) {
          if ($(n).text().indexOf(activity + ' ') === 0) {
            $(n).click();
          }
        });
      }, entry.activity);
    }
  }
  if (hasFirstRow) {
    var selector = createSelector(entry)
    await page.evaluate(function(selector, id, activity, dayOffset) {
      var day = new Date().getDay()
      // well, except sunday should be 7 for this to work.
      if (!day) {
        day = 7
      }
      var weekAdjustment = 0
      if (day - dayOffset <= 0) {
        weekAdjustment = 6
      }
      var delta = day + 2 - (dayOffset - weekAdjustment);
      jQuery(selector).each(function(j, k) {
        var $td = $(k).closest('td')
        if (!id) {
          $td = $(k);
          // Also see if the sibling is an empty
          if (!$td.hasClass('table-cell--text')) {
            return
          }
          var colText = $td.text().trim
          if (colText.length) {
            return;
          }
        }
        if ($td.next().text().trimLeft().indexOf(activity + ' ') === 0) {
          window.textInput = $($(k).closest('tr').find('td')[delta]).find('input[type="text"]')
        }
      })
    }, selector, entry.id, entry.activity, dayOffset);
  }
  else {
    await page.evaluate(function(dayOffset) {
      var day = new Date().getDay()
      // well, except sunday should be 7 for this to work.
      if (!day) {
        day = 7
      }
      var weekAdjustment = 0
      if (day - dayOffset <= 0) {
        weekAdjustment = 6
      }
      var delta = day + 2 - (dayOffset - weekAdjustment);
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
    window.textInput.trigger('focus')
  }, entry.duration)
  await page.click('[data-area-selector="' + areaDataSelector + '"]')
  await page.waitForTimeout(1200);
  await page.evaluate(function (text) {
    window.areaInput.val(text)
  }, entry.text)
  await page.waitForTimeout(1200);
  // If we first scroll down, and then scroll up, then the button for saving, will always be as expected.
  await page.evaluate(_ => {
    document.getElementById('scrollContainer').scrollTop = 500
  });
  await page.waitForTimeout(200);
  await page.evaluate(_ => {
    document.getElementById('scrollContainer').scrollTop = 0
  });
  await page.waitForTimeout(200);
  await page.waitForSelector('.tlxFloatingHeaderOriginal #ajaxContenttoolbarContainer button.storeAction', {
    visible: true
  })
  await page.click('.tlxFloatingHeaderOriginal #ajaxContenttoolbarContainer button.storeAction')
  await page.waitForTimeout(1200);
}
