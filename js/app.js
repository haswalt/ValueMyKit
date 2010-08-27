var vmk = {
  amazon: {
    id: '0QKNT33QJ8T5NYMAYP02',
    s: 'w6olv/GbYYZkD9QZTJa7dvt2SLczvJxficFQkdgk',
    limit: 3
  },
  ebay: {
    id: 'LQDInter-d3b1-490b-8acc-d6c9a8c08c6a',
    perPage: '1000'
  },
  alertTimer: null,
  products: [],
  productId: 0,
  priceDeviance: '0.10',

  init: function() {
    $('#we').find('p').fadeOut('fast', function() {
      $('#we').find('form').slideDown();
    });

    $('#we').delegate('form', 'submit', function() {
      product = $(this).find('input[name=q]').val();

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
        $('#t').find('li').removeClass('a').filter(':nth-child(2)').addClass('a');
      });
    });

    $('#c').delegate('form', 'submit', function() {
      vmk.getPrices($(this).find('select').val());

      return false;
    });
  },

  getPrices: function(c) {
    $('#c').slideUp(function() {
      $('#t').find('li').removeClass('active').filter(':last').addClass('active');
      $('#e').slideDown();
    });

    var url = '',
        query = '',
        title = '',
        request = '';
    
    url = 'http://svcs.ebay.com/services/search/FindingService/v1?';
    query = 'OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.0.0' +
    '&RESPONSE-DATA-FORMAT=JSON&SECURITY-APPNAME=' + this.ebay.id + '&GLOBAL-ID=EBAY-US' +
    '&REST-PAYLOAD&paginationInput.entriesPerPage=' + this.ebay.perPage + '&itemFilter(0).name=Condition' +
    '&itemFilter(0).value(0)=' + c + '&SoldItemsOnly=true';

    title = vmk.products[vmk.productId].ItemAttributes.Title.replace(/\(.[^\)]*\)/, '');

    request = url + query + '&keywords="' + encodeURIComponent(title) + '"' + '&callback=?';

    $.getJSON(request, function(data) {
      var modes = new Array(),
          prices= new Array(),
          valid = new Array();
      var total = 0,
          i = 0,
          mean = 0,
          d = 0,
          dMin = 0,
          dMax = 0,
          price = 0,
          min = 0,
          max = 0,
          mode = 0,
          tally = 0;
      
      if(data.findItemsAdvancedResponse[0].searchResult[0]['@count'] == 0 || typeof(data.findItemsAdvancedResponse[0].searchResult[0]['@count']) == "undefined") {
        $('#e').slideUp(function() {
          $('#p').html('Loading...');
          $('#we').slideDown();
        })
        vmk.alertBar('Sorry, we could not calculate an estimate', 'error');
      }

      for(i in data.findItemsAdvancedResponse[0].searchResult[0].item) {
        result = data.findItemsAdvancedResponse[0].searchResult[0].item[i];
        price = parseFloat(result.sellingStatus[0].currentPrice[0]['__value__']);
        prices.push(price);
        total += +price;
      }

      mean = total / prices.length;
      d = mean * vmk.priceDeviance;
      dMin = mean - d;
      dMax = mean + d;

      for(i in prices) {
        price = prices[i];
        if(price >= dMin && price <= dMax) {
          valid.push(price);
        }
      }

      valid.sort(vmk.asc);

      min = valid[0];
      max = valid[valid.length - 1];
      
      for(i in valid) {
        price = valid[i];

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

      if(mode < 1) {
        mode = mean.toFixed(2);
      }

      $('#e').html('<h2>We estimate your kit is worth &pound;' + mode + '</h2><h3>We found it available between &pound;' + min + ' and &pound;' + max + '</h3>');
    });
  },

  productLookup: function(product, category) {
    var url = '',
        use = '',
        query = '',
        request = '';
    
    url = 'http://query.yahooapis.com/v1/public/yql?q=';
    use = 'USE "http://www.datatables.org/amazon/amazon.ecs.xml" AS amazon.ecs;';
    query = 'SELECT ItemAttributes.Title, MediumImage.URL, Offers.Offer.OfferListing.Price FROM amazon.ecs(' + this.amazon.productLimit + ') ' +
    'WHERE Operation = "ItemSearch" AND SearchIndex = "' + category +'" AND ResponseGroup = "Medium,Offers" ' +
    'AND AWSAccessKeyId = "' + this.amazon.id + '" AND secret = "' + this.amazon.s + '" ' +
    'AND Keywords = "' + product + '"';

    request = url + encodeURIComponent(use + query) + '&format=json&callback=?';

    $.getJSON(request, this.parseAmazonProducts);
  },

  parseAmazonProducts: function(data) {
    var i = 0,
        product = '',
        defail = '',
        img = '';

    if(data.query.results == null || data.query.results.Item.length < 1) {
      $('#p').slideUp();
      $('#we').slideDown();
      vmk.alertBar('No Products found!', 'error');
      return false;
    }

    $('#we').slideUp();
    $('#p').slideDown();

    $('#p').html('<h2>Please select the product closest to the your item</h2>');
    for(i in data.query.results.Item) {
      product = data.query.results.Item[i];
      if(typeof(product.ItemAttributes) != "undefined") {
        img = '<div class="no-image">No Product Image</div>';

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