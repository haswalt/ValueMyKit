var vmk = {
  amazon: {
    keyId: '0QKNT33QJ8T5NYMAYP02',
    secret: 'w6olv/GbYYZkD9QZTJa7dvt2SLczvJxficFQkdgk',
    productLimit: 3
  },
  ebay: {
    apiVersion: '1.0.0',
    appId: 'LQDInter-d3b1-490b-8acc-d6c9a8c08c6a',
    globalId: 'EBAY-US',
    cs: [
      'For Parts Not Working',
      'Acceptable',
      'Good',
      'Very Good',
      'Used',
      'Seller Refurbished',
      'Manufacturer Refurbished',
      'New With Defects',
      'New'
    ],
    perPage: '1000'
  },
  alertTimer: null,
  products: [],
  productId: 0,
  c: 'Used',
  priceDeviance: '0.10',

  init: function() {
    $('#we').find('p').fadeOut('fast', function() {
      $('#we').find('form').slideDown();
    });

    $('#we').delegate('form', 'submit', function() {
      var product = $(this).find('input[name=q]').val();

      if(product.length < 2) {
        vmk.alertBar('You product name is too short!');
        return false;
      }

      $('#we').slideUp();
      $('#p').slideDown();

      vmk.productLookup(product, $(this).find('select').val());
      
      return false;
    });
  },

  getc: function() {
    $('#p').slideUp(function() {
      $('#c').slideDown(function() {
        $('#t').find('li').removeClass('active').filter(':nth-child(2)').addClass('active');
      });
    });

    $('#c').find('input[type=range]').bind('change', function() {
      vmk.c = vmk.ebay.cs[$(this).val()];
      var n = (100 / 9) * (9 - $(this).val());
      var R = Math.floor((255*n)/100);
      var G = Math.floor((255*(100-n))/100);

      $('#c').find('.output').text(vmk.c).css({
        backgroundColor: 'rgb(' + R + ', ' + G + ', 0)'
      });
    });

    $('#c').delegate('form', 'submit', function() {
      vmk.getPrices(vmk.c);

      return false;
    });
  },

  getPrices: function(c) {
    $('#c').slideUp(function() {
      $('#t').find('li').removeClass('active').filter(':last').addClass('active');
      $('#e').slideDown();
    });
    
    var url = 'http://svcs.ebay.com/services/search/FindingService/v1?';
    var query = 'OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=' + this.ebay.apiVersion +
    '&RESPONSE-DATA-FORMAT=JSON&SECURITY-APPNAME=' + this.ebay.appId + '&GLOBAL-ID=' + this.ebay.globalId +
    '&REST-PAYLOAD&paginationInput.entriesPerPage=' + this.ebay.perPage + '&itemFilter(0).name=c' +
    '&itemFilter(0).value(0)=' + c + '&SoldItemsOnly=true';

    var titleRegex = /[\w\.-_\s]+/;
    var title = vmk.products[vmk.productId].ItemAttributes.Title.match(titleRegex);

    var request = url + query + '&keywords="' + encodeURIComponent(title) + '"' + '&callback=?';

    $.getJSON(request, function(data) {
      if(data.findItemsAdvancedResponse[0].searchResult['@count'] == 0) {
        $('#e').slideUp(function() {
          $('#we').slideDown();
        });
        vmk.alertBar('Sorry, we could not calculate an estimate', 'error');
      }

      var prices = new Array();
      var total = 0;
      for(var i in data.findItemsAdvancedResponse[0].searchResult[0].item) {
        var result = data.findItemsAdvancedResponse[0].searchResult[0].item[i];
        var price = parseFloat(result.sellingStatus[0].currentPrice[0]['__value__']);
        prices.push(price);
        total += +price;
      }

      prices.sort(vmk.asc);

      var mean = total / prices.length;
      var d = mean * vmk.priceDeviance;
      var dMin = mean - d;
      var dMax = mean + d;

      var valid = new Array();
      for(var i in prices) {
        var price = prices[i];
        if(price >= dMin && price <= dMax) {
          valid.push(price);
        }
      }

      valid.sort(vmk.asc);

      var min = valid[0];
      var max = valid[valid.length - 1];

      var modes = new Array();
      var tally = 0;
      var mode = 0;
      for(var i in valid) {
        var price = valid[i];

        if(typeof(modes[price]) != "undefined") {
          modes[price]++;
        } else {
          modes[price] = 1;
        }

        if(modes[price] > tally) {
          tally = modes[price];
          mode = price;
        } else if(modes[price] == tally && price > mode) {
          mode = price;
        }
      }

      $('#e').html('<h2>We estimate your kit is worth &pound;' + mode + '.</h2><h3>We found it available for between &pound;' + min + ' and &pound;' + max + '</h3>');
    });
  },

  productLookup: function(product, category) {
    var url = 'http://query.yahooapis.com/v1/public/yql?q=';
    var use = 'USE "http://www.datatables.org/amazon/amazon.ecs.xml" AS amazon.ecs;';
    var query = 'SELECT ItemAttributes.Title, MediumImage.URL, Offers.Offer.OfferListing.Price FROM amazon.ecs(' + this.amazon.productLimit + ') ' +
    'WHERE Operation = "ItemSearch" AND SearchIndex = "' + category +'" AND ResponseGroup = "Medium,Offers" ' +
    'AND AWSAccessKeyId = "' + this.amazon.keyId + '" AND secret = "' + this.amazon.secret + '" ' +
    'AND Keywords = "' + product + '"';

    var request = url + encodeURIComponent(use + query) + '&format=json&callback=?';

    $.getJSON(request, this.parseAmazonProducts);
  },

  parseAmazonProducts: function(data) {
    if(data.query.results == null || data.query.results.Item.length < 1) {
      $('#p').slideUp();
      $('#we').slideDown();
      vmk.alertBar('No Products found!', 'error');
      return false;
    }

    $('#we').slideUp();
    $('#p').slideDown();

    $('#p').html('<h2>Please select the product closest to the your item</h2>');
    for(var i in data.query.results.Item) {
      var product = data.query.results.Item[i];
      if(typeof(product.ItemAttributes) != "undefined") {
        var img = '<div class="no-image">No Product Image</div>';

        if(typeof(product.MediumImage) != "undefined") {
          img = '<img src="' + product.MediumImage.URL + '" width="108">';
        }

        detail = $('<ul><li>' + img + '</li><li><h3>' + product.ItemAttributes.Title + '</h3><hr><p><a href=# data-pid=' + i + ' class=b>Choose</a></li></ul><div style=clear:both></div>');
        detail.hide();
        $('#p').append(detail);
        detail.slideDown();

        vmk.products[i] = product;
      }
    }

    if(vmk.products.length < 1) {
      $('#p').slideUp();
      $('#we').slideDown();
      vmk.alertBar('No Products found!', 'error');
      return false;
    }

    $('#p').delegate('a.b', 'click', function() {
      vmk.productId = $(this).attr('data-pid');
      vmk.getc();

      return false;
    });
  },

  alertBar: function(message, type) {
    $('#al').html(message).slideDown(500);

    clearTimeout(vmk.alertTimer);
    vmk.alertTimer = setTimeout(function() {
      $('#al').slideUp(300);
    }, 2000);
  },

  asc: function(a, b) {
    return (a - b);
  }
}