/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, dojo */
/*mendix */
/*
    BootstrapRTE
    ========================

    @file      : BootstrapRTE.js
    @version   : 2.0
    @author    : Pauline Oudeman, Gerhard Richard Edens
    @date      : Mon, 02 Mar 2015 11:49:10 GMT
    @copyright : 
    @license   : 

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
require({
    packages: [{
            name: 'jquery',
            location: '../../widgets/BootstrapRTE/lib',
            main: 'jquery'
        },
        {
            name: 'bootstrap-rte',
            location: '../../widgets/BootstrapRTE/lib',
            main: 'bootstrap-wysiwyg'
        },
        {
            name: 'jquery-hotkeys',
            location: '../../widgets/BootstrapRTE/lib/external',
            main: 'jquery.hotkeys'
               }]
}, [
    'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
    'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
    'dijit/focus', 'dojo/fx', 'dojo/fx/Toggler', 'dojo/html', 'dojo/_base/event', 'jquery', 'dojo/text!BootstrapRTE/widget/template/BootstrapRTE.html', 'bootstrap-rte', 'jquery-hotkeys'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, focusUtil, coreFx, Toggler, domHtml, domEvent, $, widgetTemplate) {
    'use strict';

    // Declare widget's prototype.
    return declare('BootstrapRTE.widget.BootstrapRTE', [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        attribute: "",
        showToolbarOnlyOnFocus: false,
        boxMinHeight: 100,
        boxMaxHeight: 600,
        onchangeMF: "",
        toolbarButtonFont: true,
        toolbarButtonFontsize: true,
        toolbarButtonEmphasis: true,
        toolbarButtonList: true,
        toolbarButtonDent: true,
        toolbarButtonJustify: true,
        toolbarButtonLink: true,
        toolbarButtonPicture: true,
        toolbarButtonDoRedo: true,
		toolbarButtonHtml: true,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + ' - postCreate');

            // Check settings.
            if (this.boxMaxHeight < this.boxMinHeight) {
                console.error("Widget configuration error; Bootstrap RTE: Max size is smaller the Min Size");
            }

            // Setup widgets
            this._setupWidget();

            // Create childnodes
            this._createChildNodes();

            // Setup events
            this._setupEvents();

        },

        // DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
        startup: function () {

            // postCreate
            console.log(this.id + ' - startup');
        },

        /**
         * What to do when data is loaded?
         */

        update: function (obj, callback) {
            // startup
            console.log(this.id + ' - update');

            if (obj) {
                var self = this;
                this._mxObj = obj;

                // set the content on update
                domHtml.set(this._inputfield, this._mxObj.get(this.attribute));
                this._resetSubscriptions();

            } else {
                // Sorry no data no show!
                console.log('BootstrapRTE  - update - We did not get any context object!');
            }

            // Execute callback.
            if (typeof callback !== 'undefined') {
                callback();
            }
        },

        enable: function () {

        },

        disable: function () {

        },

        uninitialize: function () {

        },


        /**
         * Extra setup widget methods.
         * ======================
         */
        _setupWidget: function () {

            // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
            this._wgtNode = this.domNode;

        },

        // Create child nodes.
        _createChildNodes: function () {

            // Create input field.
            this._inputfield = dom.create('div', {
                'id': this.id + '_editor'
            });

            // Created toolbar and editor.
            this._createToolbar();
            this._addEditor();

            // console.log('BootstrapRTE - createChildNodes events');
        },

        // Attach events to newly created nodes.
        _setupEvents: function () {
            var self = this, 
                handleFocus = null,
                inFocus = null;
            
            if (this.showToolbarOnlyOnFocus) {
                domStyle.set(this._toolbarNode, "display", "none"); //Maybe box is first in tab order, does this need to be checked?

                this._isToolbarDisplayed = false;

                this._toggler = new Toggler({
                    node: self._toolbarNode,
                    showFunc: coreFx.wipeIn,
                    hideFunc: coreFx.wipeOut
                });

                handleFocus = $(this.domNode).on('click', function (event) {
                    inFocus = self._inFocus(self.domNode, event.target);
                    if (inFocus && !self._isToolbarDisplayed) {
                        self._toggler.show();
                        self._isToolbarDisplayed = true;
                    } else if (!inFocus && self._isToolbarDisplayed) {
                        self._toggler.hide();
                        self._isToolbarDisplayed = false;
                    }
                });

            }
        },

        _resetSubscriptions: function () {
            if (this._handles.length > 0) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });

                this._handles = null;
            }
            if (!this._handles) {
                this._handles = [];
            }

            // fix microflow change calls
            var handle = mx.data.subscribe({
                    guid: this._mxObj.getGuid(),
                    callback: lang.hitch(this, this._loadData)
                }),
                // set the validation handle.
                validationHandle = mx.data.subscribe({
                    guid: this._mxObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, function (validations) {
                        var val = validations[0],
                            msg = val.getReasonByAttribute(this.attribute);
                        if (msg) {
                            this.addError(msg);
                            val.removeAttribute(this.attribute);
                        }

                    })
                });

            this._handles.push(handle);
            this._handles.push(validationHandle);
        },

        /**
         * Interaction widget methods.
         * ======================
         */
        _inFocus: function (node, newValue) {
            var nodes = null,
                i = 0;
            if (newValue) {
                nodes = $(node).children().andSelf();
                for (i = 0; i < nodes.length; i++) {
                    if (nodes[i] === $(newValue).closest(nodes[i])[0]) {
                        return true;
                    }
                }
            } else {
                return false;
            }
        },

        _loadData: function () {

            // Set the html of the inputfield after update!
            domHtml.set(this._inputfield, this._mxObj.get(this.attribute));

        },

        /**
         * Custom widget functions
         */

        _createToolbar: function () {

            //Create toolbar node.
            this._toolbarNode = dom.create('div', {
                'class': 'btn-toolbar toolbar_' + this.id,
                'data-role': 'editor-toolbar-' + this.id,
                'data-target': '#' + this.id + '_editor'
            });

            //Load templates
            if (this.toolbarButtonFont) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_font.html')), this._toolbarNode);
            }

            if (this.toolbarButtonFontsize) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_fontsize.html')), this._toolbarNode);
            }

            if (this.toolbarButtonEmphasis) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_basic.html')), this._toolbarNode);
            }
            if (this.toolbarButtonList && this.toolbarButtonDent) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_list_and_dent.html')), this._toolbarNode);
            } else if (this.toolbarButtonList) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_list.html')), this._toolbarNode);
            } else if (this.toolbarButtonDent) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_dent.html')), this._toolbarNode);
            } 
			

            if (this.toolbarButtonJustify) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_justify.html')), this._toolbarNode);
            }
			
			if (this.toolbarButtonHtml) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_html.html')), this._toolbarNode);
            } 

            if (this.toolbarButtonLink) {
                var template = domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_url.html')), 
                    urlfield = domQuery('input', template)[0];
                domConstruct.place(template, this._toolbarNode);
                
                this.connect(urlfield, 'click', function(e){
                    var target = e.currentTarget || e.target;
                    target.focus();
                    domEvent.stop(e);
                });
            }

            if (this.toolbarButtonPicture) {
                domConstruct.place(domConstruct.toDom(dojo.cache('BootstrapRTE.widget', 'template/BootstrapRTE_toolbar_picture.html')), this._toolbarNode);
            }
        },



        _addEditor: function () {
            domConstruct.place(this._toolbarNode, this.domNode);
            domConstruct.place(this._inputfield, this.domNode, 'last');

            //force the MX-styles.
            domClass.add(this._inputfield, 'form-control mx-bootstrap-textarea mx-textarea-input mx-textarea-input-noresize');
            domStyle.set(this._inputfield, {
                'min-height': this.boxMinHeight + 'px',
                'max-height': this.boxMaxHeight + 'px'
            });

            $('#' + this.id + '_editor').wysiwyg({
                toolbarSelector: '[data-role=editor-toolbar-' + this.id + ']'
            });
            this._addListeners();
        },

        _addListeners: function () {
            var self = this,
                target = null;

            this.connect(this._inputfield, 'blur', lang.hitch(this, function (e) {
                this._fetchContent();
            }));

            //Ok, I'm just going to stick to jquery here for traversing the dom. Much easier.
            $('#' + this.id + ' .dropdown-toggle').on("click", function (e) {
                $(this).parent().find('div').toggle();
                $(this).parent().find('ul').toggle();
                $(this).parent().find('input').focus();
            });

            //Check if we have to hide the dropdown box.
            this.connect(this.domNode, 'click', function (e) {
                var isContainer = self._testTarget(e);
                if (!isContainer) {
                    domQuery('#' + this.id + ' .dropdown-menu').style({
                        'display': 'none'
                    });
                }
            });
        },

        _fetchContent: function () {
            var text = $(this._inputfield).html(),
                _valueChanged = (this._mxObj.get(this.attribute) !== text);

            this._mxObj.set(this.attribute, text);

            if (_valueChanged && this.onchangeMF !== "") {
                this._execMf(this.onchangeMF, this._mxObj.getGuid());
            }

        },

        _execMf: function (mf, guid) {
            mx.data.action({
                params: {
                    applyto: "selection",
                    actionname: mf,
                    guids: [guid]
                }
            });
        },

        _testTarget: function (e) {
            //See if we clicked the same button
            var isButton = false,
                isContainer = {},
                value = {};

            dojoArray.forEach(domQuery('#' + this.id + ' .dropdown-toggle'), function (object, index) {
                if (!isButton) {
                    isButton = $(e.target).parent()[0] === object || $(e.target) === object;
                }
            });

            //See if we clicked inside the box
            isContainer = $(e.target).closest('ul').children('.dropdown-toggle').length > 0 ||
                $(e.target).children('.dropdown-toggle').length > 0 ||
                $(e.target).parent().children('.dropdown-toggle').length > 0;

            value = isContainer;
            if (isButton === true) {
                value = isButton;
            }

            return value;
        }
    });
});