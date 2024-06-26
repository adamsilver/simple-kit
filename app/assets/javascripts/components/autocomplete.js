/*
value.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
*/
App.Autocomplete = function(options) {
	this.options = options
	this.select = $(this.options.select);
	this.container = this.select.parent();
	this.wrapper = $('<div class="autocomplete"></div>');
	this.container.append(this.wrapper);
	this.createTextBox();
	if(this.options.showMenuOnClick) {
		this.wrapper.addClass('autocomplete--showAll')
		this.createArrowIcon();
	}
	this.createMenu();
	this.hideSelectBox();
	this.createStatusBox();
	this.setupKeys();
	$(document).on('click', $.proxy(this, 'onDocumentClick'));
};

App.Autocomplete.prototype.onDocumentClick = function(e) {
	if(!$.contains(this.container[0], e.target)) {
	  this.hideMenu();
    this.removeTextBoxFocus();
  }
};

App.Autocomplete.prototype.setupKeys = function() {
	this.keys = {
		enter: 13,
		esc: 27,
		space: 32,
		up: 38,
		down: 40,
		tab: 9,
		left: 37,
		right: 39,
		shift: 16
   };
};

App.Autocomplete.prototype.onTextBoxFocus = function() {
	this.textBox.addClass('autocomplete-isFocused');
};

App.Autocomplete.prototype.removeTextBoxFocus = function() {
	this.textBox.removeClass('autocomplete-isFocused');
};

App.Autocomplete.prototype.onTextBoxClick = function(e) {
	this.clearOptions();
	var options = this.getAllOptions();
	this.buildMenu(options);
	this.updateStatus(options.length);
	this.showMenu();
	if(typeof e.currentTarget.select === 'function') {
    e.currentTarget.select();
  }
};

App.Autocomplete.prototype.onTextBoxKeyUp = function(e) {
	switch (e.keyCode) {
		case this.keys.esc:
		case this.keys.up:
		case this.keys.left:
		case this.keys.right:
		case this.keys.space:
		case this.keys.enter:
		case this.keys.shift:
		case this.keys.tab:
			// ignore these keys otherwise
			// the menu will show briefly
			break;
		case this.keys.down:
			this.onTextBoxDownPressed(e);
			break;
		default:
			this.onTextBoxType(e);
	}
};

App.Autocomplete.prototype.onMenuKeyDown = function(e) {
	switch (e.keyCode) {
		case this.keys.up:
			// want to highlight previous option
			this.onOptionUpArrow(e);
			break;
		case this.keys.down:
			// want to highlight next suggestion
			this.onOptionDownArrow(e);
			break;
		case this.keys.enter:
			// want to select the suggestion
			this.onOptionEnter(e);
			break;
		case this.keys.space:
			// want to select the suggestion
			this.onOptionSpace(e);
			break;
		case this.keys.esc:
			// want to hide options
			this.onOptionEscape(e);
			break;
		case this.keys.tab:
			this.hideMenu();
			this.removeTextBoxFocus();
			break;
		default:
			this.textBox.focus();
	}
};

App.Autocomplete.prototype.onTextBoxType = function(e) {
	if(this.textBox.val().trim().length > 0) {
		var options = this.getOptions(this.textBox.val().trim().toLowerCase());
		this.buildMenu(options);
		this.showMenu();
		this.updateStatus(options.length);
	} else {
		this.hideMenu();
	}
	this.updateSelectBox();
};

App.Autocomplete.prototype.updateSelectBox = function() {
	var value = this.textBox.val().trim();
	var option = this.getMatchingOption(value);
	if(option) {
		this.select.val(option.value);
	} else {
		this.select.val('');
	}
};

App.Autocomplete.prototype.onOptionEscape = function(e) {
	this.clearOptions();
	this.hideMenu();
	this.focusTextBox();
};

App.Autocomplete.prototype.focusTextBox = function() {
	this.textBox.focus();
};

App.Autocomplete.prototype.onOptionEnter = function(e) {
	if(this.isOptionSelected()) {
		this.selectActiveOption();
	}
	// we don't want form to submit
	e.preventDefault();
};

App.Autocomplete.prototype.onOptionSpace = function(e) {
	if(this.isOptionSelected()) {
		this.selectActiveOption();
		// we don't want a space to be added to text box
		e.preventDefault();
	}
};

App.Autocomplete.prototype.onOptionClick = function(e) {
	var option = $(e.currentTarget);
	this.selectOption(option);
};

App.Autocomplete.prototype.selectActiveOption = function() {
	var option = this.getActiveOption();
	this.selectOption(option);
};

App.Autocomplete.prototype.selectOption = function(option) {
	var value = option.attr('data-option-value');
	this.setValue(value);
	this.hideMenu();
	this.focusTextBox();
};

App.Autocomplete.prototype.onTextBoxDownPressed = function(e) {
	var option;
	var options;
	var value = this.textBox.val().trim();
	// Empty value or exactly matches an option
	// then show all the options
	if(value.length === 0 || this.isExactMatch(value)) {
		options = this.getAllOptions();
		this.buildMenu(options);
		this.showMenu();
		option = this.getFirstOption();
		this.highlightOption(option);
	} else {
		options = this.getOptions(value);
		if(options.length > 0) {
			this.buildMenu(options);
			this.showMenu();
			option = this.getFirstOption();
			this.highlightOption(option);
		}
	}
};

App.Autocomplete.prototype.onOptionDownArrow = function(e) {
	var option = this.getNextOption();
	if(option[0]) {
		this.highlightOption(option);
	}
	e.preventDefault();
};

App.Autocomplete.prototype.onOptionUpArrow = function(e) {
	if(this.isOptionSelected()) {
		option = this.getPreviousOption();
		if(option[0]) {
			this.highlightOption(option);

		} else {
			this.focusTextBox();
			this.hideMenu();
		}
	}
	e.preventDefault();
};

App.Autocomplete.prototype.isOptionSelected = function() {
	return this.activeOptionId;
};

App.Autocomplete.prototype.getActiveOption = function() {
	return $('#'+this.activeOptionId);
};

App.Autocomplete.prototype.getFirstOption = function() {
	return this.menu.find('li').first();
};

App.Autocomplete.prototype.getPreviousOption = function() {
	return $('#'+this.activeOptionId).prev();
};

App.Autocomplete.prototype.getNextOption = function() {
	return $('#'+this.activeOptionId).next();
};

App.Autocomplete.prototype.highlightOption = function(option) {
	if(this.activeOptionId) {
		var activeOption = this.getOptionById(this.activeOptionId);
		activeOption.attr('aria-selected', 'false');
	}

	option.attr('aria-selected', 'true');

	if(!this.isElementVisible(this.menu, option)) {
		this.menu.scrollTop(this.menu.scrollTop() + option.position().top) ;
	}

	this.activeOptionId = option[0].id;
	option.focus();
};

App.Autocomplete.prototype.getOptionById = function(id) {
	return $('#'+id);
};

App.Autocomplete.prototype.showMenu = function() {
	this.menu.removeClass('app-hidden');
	this.textBox.attr('aria-expanded', 'true');
};

App.Autocomplete.prototype.hideMenu = function() {
	this.menu.addClass('app-hidden');
	this.textBox.attr('aria-expanded', 'false');
	this.activeOptionId = null;
	this.clearOptions();
};

App.Autocomplete.prototype.clearOptions = function() {
	this.menu.empty();
};

App.Autocomplete.prototype.getOptions = function(value) {
	var matches = [];
	this.select.find('option').each(function(i, el) {
		if($(el).val().trim().length > 0 && $(el).text().toLowerCase().indexOf(value.toLowerCase()) > -1
				|| $(el).attr('data-alt') && $(el).attr('data-alt').toLowerCase().indexOf(value.toLowerCase()) > -1) {
			matches.push({
				text: $(el).text(),
				value: $(el).val()
			});
		}
	});
	return matches;
};

App.Autocomplete.prototype.getAllOptions = function() {
	var filtered = [];
	var options = this.select.find('option');
	var option;
	for(var i = 0; i < options.length; i++) {
		option = options.eq(i);
		var value = option.val();
		if(value.trim().length > 0) {
			filtered.push({
				text: option.text(),
				value: option.val()
			});
		}
	}
	return filtered;
};

App.Autocomplete.prototype.isExactMatch = function(value) {
	return this.getMatchingOption(value);
};

App.Autocomplete.prototype.getMatchingOption = function(value) {
	var option = null;
	var options = this.select.find('option');
	for(var i = 0; i < options.length; i++) {
		if(options[i].text.toLowerCase() === value.toLowerCase()) {
			option = options[i];
			break;
		}
	}
	return option;
};

App.Autocomplete.prototype.buildMenu = function(options) {
	this.clearOptions();
	this.activeOptionId = null;

	if(options.length) {
		for(var i = 0; i < options.length; i++) {
			this.menu.append(this.getOptionHtml(i, options[i]));
		}
	} else {
		this.menu.append(this.getNoResultsOptionHtml());
	}
	this.menu.scrollTop(this.menu.scrollTop());
};

App.Autocomplete.prototype.getNoResultsOptionHtml = function() {
	return '<li class="autocomplete-optionNoResults">' + 'No results' + '</li>';
};

App.Autocomplete.prototype.getOptionHtml = function(i, option) {
	return '<li tabindex="-1" aria-selected="false" role="option" data-option-value="'+ option.value +'" id="autocomplete-option--' + i + '">' + option.text + '</li>';
};

App.Autocomplete.prototype.createStatusBox = function() {
	this.status = $('<div aria-live="polite" role="status" class="govuk-visually-hidden" />');
	this.wrapper.append(this.status);
};

App.Autocomplete.prototype.updateStatus = function(resultCount) {
	if(resultCount === 0) {
		this.status.text('No results.');
	} else {
		this.status.text(resultCount + ' results available.');
	}
};

App.Autocomplete.prototype.hideSelectBox = function() {
	this.select.attr('aria-hidden', 'true');
	this.select.attr('tabindex', '-1');
	this.select.addClass('govuk-visually-hidden');
	this.select.prop('id', '');
};

App.Autocomplete.prototype.createTextBox = function() {
	this.textBox = $('<input autocapitalize="none" type="text" autocomplete="off" class="govuk-input">');
	this.textBox.attr('aria-owns', this.getOptionsId());
	this.textBox.attr('aria-autocomplete', 'list');
	this.textBox.attr('role', 'combobox');

	this.textBox.prop('id', this.select.prop('id'));

	var selectedVal = this.select.find('option:selected').val();

	if(selectedVal.trim().length > 0) {
		this.textBox.val(this.select.find('option:selected').text());
	}

	this.wrapper.append(this.textBox);
	if(this.options.showMenuOnClick) {
		this.textBox.on('click', $.proxy(this, 'onTextBoxClick'));
	}

	this.textBox.on('keydown', $.proxy(function(e) {
		switch (e.keyCode) {
			// this ensures that when users tabs away
			// from textbox that the normal tab sequence
			// is adhered to. We hide the options, which
			// removes the ability to focus the options
			case this.keys.tab:
				this.hideMenu();
				this.removeTextBoxFocus();
				var value = this.textBox.val().trim();
				if(this.isExactMatch(value)) {
					this.setValue(value);
				}
				break;
		}
	}, this));
	this.textBox.on('keyup', $.proxy(this, 'onTextBoxKeyUp'));
	this.textBox.on('focus', $.proxy(this, 'onTextBoxFocus'));
};

App.Autocomplete.prototype.getOptionsId = function() {
	return 'autocomplete-options--'+this.select.prop('id');
};

App.Autocomplete.prototype.createArrowIcon = function() {
	var arrow = $('<svg focusable="false" version="1.1" xmlns="http://www.w3.org/2000/svg"><g><polygon points="2,3 20,3 11,17"></polygon></g></svg>');

	// var arrow = $('<a class="autocomplete-showAll" href="#">Show all</a>')
	this.wrapper.append(arrow);
	arrow.on('click', $.proxy(this, 'onArrowClick'));
};

App.Autocomplete.prototype.onArrowClick = function(e) {
	this.clearOptions();
	var options = this.getAllOptions();
	this.buildMenu(options);
	this.updateStatus(options.length);
	this.showMenu();
	this.textBox.focus();
};

App.Autocomplete.prototype.createMenu = function() {
	this.menu = $('<ul id="'+this.getOptionsId()+'" role="listbox" class="app-hidden"></ul>');
	this.wrapper.append(this.menu);
	this.menu.on('click', '[role=option]', $.proxy(this, 'onOptionClick'));
	this.menu.on('keydown', $.proxy(this, 'onMenuKeyDown'));
};

App.Autocomplete.prototype.isElementVisible = function(container, element) {
	var containerHeight = $(container).height();
	var elementTop = $(element).offset().top;
	var containerTop = $(container).offset().top;
	var elementPaddingTop = parseInt($(element).css('padding-top'), 10);
	var elementPaddingBottom = parseInt($(element).css('padding-bottom'), 10);
	var elementHeight = $(element).height() + elementPaddingTop + elementPaddingBottom;
  var visible;

  if ((elementTop - containerTop < 0) || (elementTop - containerTop + elementHeight > containerHeight)) {
		visible = false;
  } else {
		visible = true;
  }
  return visible;
};

App.Autocomplete.prototype.getOption = function(value) {
	return this.select.find('option[value="'+value+'"]');
};

App.Autocomplete.prototype.setValue = function(val) {
	this.select.val(val);
	var text = this.getOption(val).text();
	if(val.trim().length > 0) {
		this.textBox.val(text);
	} else {
		this.textBox.val('');
	}
};