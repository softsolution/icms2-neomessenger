/**
 * --------------------------------------------------------------------------
 * Neomessenger v2.6.0
 * Copyright 2013-2017 Victor Filinov aka NEOm@ster
 * --------------------------------------------------------------------------
 */

// TODO: Нужно что-то менять (все переписывать).

var icms = icms || {};
var nm = nm || {};

icms.neomessenger = (function ($) {
    "use strict";

    var app = this;

    /* ------------------------------------------------------------------------- */

    // Инициализация мессенджера
    this.onDocumentReady = function() {

        this.options     = nm.options;
        this.currentUser = nm.currentUser;
        this.htmlEditor  = nm.htmlEditor;

        this.editors     = {};

        this.isMobile    = this.detectMobile();
        this.isRetina    = this.detectRetina();
        this.favicon     = this.initFavicon();

        this.recipientId = 0;
        this.messagesCount = 0;
        this.lastUnreadMessageId = 0;

        this.isRefreshEnabled = true;
        this.refreshTimer     = null;
        this.isRefreshing     = false;
        this.abortRefresh     = false;

        icms.events.run('nm_init', this.options);

        this.bindEvents();
        this.widgetBtn.append();

        this.setRefresh(true);

        icms.events.run('nm_started', this.options);

    };

    /* ------------------------------------------------------------------------- */

    // Определение мобильного
    this.detectMobile = function () {
        return screen.width && screen.width < 480 || navigator.userAgent.search(/iOS|iPhone OS|Android|BlackBerry|BB10|Series ?[64]0|J2ME|MIDP|opera mini|opera mobi|mobi.+Gecko|Windows Phone/i) != -1;
    };

    /* ------------------------------------------------------------------------- */

    // Определение дисплея высокой четкости
    this.detectRetina = function () {
        return window.devicePixelRatio > 1;
    };

    /* ------------------------------------------------------------------------- */

    this.initFavicon = function () {
        return app.options.is_favicon_count ? new Favico({ animation:'popFade' }) : false;
    };

    /* ------------------------------------------------------------------------- */

    this.getSoundEnabled = function() {
        var soundEnabled = app.ls.get('soundEnabled');
        if (soundEnabled === null) {
            soundEnabled = true;
            this.setSoundEnabled(soundEnabled);
        }
        return soundEnabled;
    };

    /* ------------------------------------------------------------------------- */

    this.isPlaySound = function() {
        if (app.getSoundEnabled()) {
            var lastMessageSounded = app.ls.get('lastMessageSounded') || 0;
            return (app.lastUnreadMessageId > lastMessageSounded);
        }
        return false;
    };

    /* ------------------------------------------------------------------------- */

    this.setSoundEnabled = function(soundEnabled) {
        app.ls.set('soundEnabled', soundEnabled);
    };

    /* ------------------------------------------------------------------------- */

    // Запросы на сервер
    this.api = {

        getContacts: function (id, callback) {
            var data = { recipient_id: id };
            this._post('get_contacts', data, callback);
        },

        deleteContact: function (id, callback) {
            var data = { contact_id: id };
            this._post('delete_contact', data, callback);
        },

        ignoreContact: function (id, callback) {
            var data = { contact_id: id };
            this._post('ignore_contact', data, callback);
        },

        forgiveContact: function (id, callback) {
            var data = { contact_id: id };
            this._post('forgive_contact', data, callback);
        },

        getMessages: function (id, callback) {
            var data = { contact_id: id };
            this._post('get_messages', data, callback);
        },

        getMessagesCount: function (callback) {
            this._post('get_messages_count', {}, callback);
        },

        moreMessages: function (contact_id, message_id, callback) {
            var data = { contact_id: contact_id, message_id: message_id };
            this._post('more_messages', data, callback);
        },

        sendMessage: function (form_data, callback) {
            this._post('send_message', form_data, callback);
        },

        readMessages: function (id) {
            var data = { contact_id: id };
            this._post('read_messages', data);
        },

        deleteMessage: function (message_ids, callback) {
            var data = { message_ids: message_ids };
            this._post('delete_message', data, callback);
        },

        restoreMessage: function (message_id, callback) {
            var data = { message_id: message_id };
            this._post('restore_message', data, callback);
        },

        getUpdate: function (data, callback) {
            this._post('get_update', data, callback);
        },

        _post: function(act, data, doneFunc) {

            var url = '/neomessenger/' + act;

            var request = $.ajax({
                url: url,
                type: 'POST',
                data: data,
                dataType: 'json'
            });

            request.done(function(data) {
                if ($.isFunction(doneFunc)) {
                    doneFunc(data);
                }
            });

            request.fail(function () {
                if ($.isFunction(doneFunc)) {
                    doneFunc({
                        error: true
                    });
                }
            });

        }

    };

    /* ------------------------------------------------------------------------- */

    this.widgetBtn = {

        append: function () {
            if (!app.options.show_widget_button) { return; }
            $('body').append(app.templates.widgetButton());
            $('#nm-widget-btn').on('click', function (e) {
                app.open();
            });
        },

        show: function () {
            if (!app.options.show_widget_button) { return; }
            $('#nm-widget-btn').removeClass('nm-widget-btn-hidden');
        },

        hide: function() {
            if (!app.options.show_widget_button) { return; }
            $('#nm-widget-btn').addClass('nm-widget-btn-hidden');
        },

        setValue: function (value) {
            if (!app.options.show_widget_button) { return; }
            if (value) {
                $('#nm-widget-btn').addClass('nm-animate');
            } else {
                $('#nm-widget-btn').removeClass('nm-animate');
            }
            var $counter = $('#nm-widget-btn').find('.nm-widget-btn-counter');
            $counter.text('+' + value);
        }

    };

    /* ------------------------------------------------------------------------- */

    // Рисование на фавиконке
    this.setFavicon = function (value) {

        if (value) {
            this.favicon.badge(value);
        }

        if (!value) {
            this.favicon.reset();
        }

    };

    /* ------------------------------------------------------------------------- */

    // Привязка обработчиков событий
    this.bindEvents = function() {

        var $msgButton = $('a[href="/messages"], a[href^="/messages/write/"]');

        // Отписываем nyromodal от сообщений
        $msgButton.unbind('click.nyroModal');

        // Подписываемся сами
        $msgButton.on('click', function (e) {
            var path = this.pathname;
            if (path.charAt(0) === '/') { path = path.slice(1); }
            var parts = path.split('/');
            if (parts[0] === 'messages') {
                e.preventDefault();
                if (parts.length > 1 && parts[1] === 'write') {
                    app.recipientId = parts[2];
                }
                app.open();
            }
        });

        // Срабатывает при открытии модального окна
        $('body').on('nm_opened', '#nm-overlay', function() {

            // Показ, скрытие списка контактов
            $(this).on('click', '.nm-toggle', function() {
                app.modal.$el.toggleClass('nm-contacts-open');
            });

            // Закрыть окно
            $(this).on('click', '.nm-close', function() {
                app.modal.hide();
            });

            $(this).on('click', '.nm-mute', function() {
                var soundEnabled = !app.getSoundEnabled();
                app.setSoundEnabled(soundEnabled);
                if (soundEnabled) {
                    $(this).addClass('nm-active');
                } else {
                    $(this).removeClass('nm-active');
                }
            });

            if (app.options.close_backdrop) {
                $(this).on('click', function(e) {
                    e = e.originalEvent || e;
                    var target = e.originalTarget || e.target || window;
                    if (target == $('#nm-overlay')[0]) {
                        app.modal.hide();
                    }
                });
            }

            // Открыть переписку с контактом
            $(this).on('click', '.user_contact', function() {
                app.contacts.select($(this).attr('rel'));
            });

            // Отмечать сообщение как прочитанное при наведении на него курсора
            $(this).on('mouseenter click', '.conversation-item.new', function() {
                app.messages.setReaded();
            });

            $(this).on('click', '.conversation-item.is_can_select', function(e) {
                var $target = $(e.target);
                if (!$target.is('a')) {
                    $(this).toggleClass('nm-selected');
                    app.messages.checkSelected();
                }
            });

            // Удаление контакта
            $(this).on('click', '.user_contact .delete', function(e) {
                app.contacts.del($(this).parent());
                e.stopPropagation();
            });

            // Поиск контакта
            $(this).on('keyup', '#nm-search-inp', function() {
                app.contacts.filter();
            });

            // Очистить строку поиска
            $(this).on('click', '#nm-search-clr', function() {
                $('#nm-userlist .user_contact').slideDown();
                $('#nm-search-inp').val('');
                $(this).hide();
            });

        });

        // перерасчет окна при ресайзе
        $(window).bind('resize', function() {
            if (app.modal.visible) {
                app.modal.onDimensions();
            }
        });

    };

    /* ------------------------------------------------------------------------- */

    this.setRefresh = function (force) {

        clearInterval(app.refreshTimer);

        var interval = force ? 0 : app.options.refreshInterval * 1000;

        app.refreshTimer = setTimeout(app.refresh, interval);

    };

    /* ------------------------------------------------------------------------- */

    this.refresh = function () {

        if (!app.isRefreshEnabled) {
            app.setRefresh();
            return;
        }

        app.isRefreshing = true;

        if (app.modal.visible) {

            var data = {
                contact_id: app.contacts.current.id || 0,
                message_last_id: app.messages.lastId
            };

            app.api.getUpdate(data, function (result) {

                if (app.abortRefresh) {
                    app.abortRefresh = false;
                    app.setRefresh();
                    return;
                }

                if (!result.error) {

                    app.lastUnreadMessageId = result.lastUnreadMessageId;

                    app.setMessagesCounter(result.messagesCount);

                    if (result.contacts) {

                        $.each(result.contacts, function () {
                            if (!app.contacts.isExist(this.id)) {
                                app.contacts.add(this);
                                app.contacts.top(this.id);
                            } else {
                                app.contacts.setCounter(this.id, this.new_messages);
                                app.contacts.setStatus(this.id, this.is_online);
                            }
                        });

                    }

                    if (result.messages) {

                        $.each(result.messages, function () {
                            var message = this.content;

                            if (this.from_id == app.contacts.current.id) {
                                app.messages.add(this);
                            }

                            if (this.id > app.messages.lastId) {
                                app.messages.lastId = this.id;
                            }

                            app.notificationsManager.notify({
                                title: this.user.nickname,
                                tag: 'nm_msg' + this.user.id,
                                image: app.isRetina ? this.user.avatar.small : this.user.avatar.micro,
                                message: message,
                                contact_id: this.user.id
                            });
                        });

                        $('#nm-chat').waitForImages({
                            finished: function () {
                                app.messages.scroll();
                            },
                            waitForAll: true
                        });

                    }

                } else {
                    console.log('Ошибка обновления данных');
                    if (result.message) {
                        alert(result.message);
                    }
                }

                app.isRefreshing = false;
                app.setRefresh();

            });

        } else {

            app.api.getMessagesCount(function (result) {

                if (!result.error) {

                    app.lastUnreadMessageId = result.lastUnreadMessageId;

                    app.setMessagesCounter(result.messagesCount);

                } else {
                    console.log('Ошибка получения количества новых сообщений');
                    if (result.message) {
                        alert(result.message);
                    }
                }

                app.isRefreshing = false;
                app.setRefresh();

            })

        }

    };

    /* ------------------------------------------------------------------------- */

    // POST запрос на сервер
    this.post = function(act, data, doneFunc) {

        var url = '/neomessenger/' + act;

        var request = $.ajax({
            url: url,
            type: 'POST',
            data: data,
            dataType: 'json'
        });

        request.done(function(data) {
            if ($.isFunction(doneFunc)) {
                doneFunc(data);
            }
        });

        request.fail(function () {
            if ($.isFunction(doneFunc)) {
                doneFunc({
                    error: true
                });
            }
        });

    };

    /* ------------------------------------------------------------------------- */

    this.setMessagesCounter = function (value) {

        var $button = $('li.messages-counter');

        $('.counter', $button).remove();

        if (value > 0) {
            var html = '<span class="counter">' + value + '</span>';
            $('a .wrap', $button).append(html);

            if (app.options.is_title_count) {
                $.animateTitle('clear');
                $.animateTitle(['*********************', LANG_NEOMESSENGER_YOU +' '+ value+' '+ spellcount(value, LANG_NEOMESSENGER_UM1, LANG_NEOMESSENGER_UM2, LANG_NEOMESSENGER_UM10)], 1000);
            }

            if (value > app.messagesCount) {
                app.notificationsManager.playSound();
            }

        } else {
            if (app.options.is_title_count) {
                $.animateTitle('clear');
            }
        }

        if (app.options.is_favicon_count) {
            app.setFavicon(value);
        }

        //API для разработчиков
		if (typeof(icms.neomessenger.MessagesCounterCallback) == 'function' && value > 0){
            icms.neomessenger.MessagesCounterCallback(value);
        }

        app.widgetBtn.setValue(value);

        app.messagesCount = value;

    };

    /* ------------------------------------------------------------------------- */

    // Открытие окна мессенджера
    this.open = function() {
        app.modal.show();
        app.contacts.load(app.recipientId);
        app.notificationsManager.start();
    };

    /* ------------------------------------------------------------------------- */

    // Контакты
    this.contacts = {

        contactsList: [],
        current: {},
        previousID: null,
        _lock: false,

        load: function(id) {

            var self = app.contacts;

            self.contactsList = [];
            self.current      = {};
            self._lock        = false;
            app.isRefreshEnabled  = false;
            self.unLock();

            app.api.getContacts(id , function(result) {

                if (!result.error) {

                    if (result.contacts) {

                        app.messages.lastId = result.message_last_id || 0;

                        $.each(result.contacts, function() {
                            self.add(this);
                        });

                        $('.nm-content').show();

                        var isSelect = false;

                        if ($(window).width() > 479) {
                            isSelect = true;
                        }

                        if (app.recipientId > 0) {
                            isSelect = true;
                        }

                        if (isSelect) {
                            self.select(self.contactsList[0].id);
                        }

                        app.modal.$el.addClass('nm-contacts-loaded');
                        app.modal.onDimensions();

                    } else {
                        $('.nm-nomess').show();
                    }

                } else {
                    console.log('Произошла ошибка при получении списка контактов');
                    if (result.message) {
                        alert(result.message);
                    }
                }

                app.isRefreshEnabled = true;
                $('.nm-loading').hide();

            });

        },

        isExist: function(id) {

            for (var i = 0; i < this.contactsList.length; i++) {
                if (this.contactsList[i].id == id) return true;
            }

            return false;

        },

        add: function(user) {

            if (this.isExist(user.id)) return;

            user.avatar = app.isRetina ? user.avatar.small : user.avatar.micro;

            this.contactsList.push(user);

            $('#nm-userlist').append(app.templates.contact({ user: user }));

        },

        select: function(id, force) {

            if (this._lock) return;

            var contact = $('#nm-contact' + id);

            app.modal.$el.addClass('nm-selected nm-contacts-open');

            if (contact.hasClass('selected') && !force) return;

            $('#nm-userlist li').removeClass('selected');

            contact.addClass('selected');

            $.each(app.contacts.contactsList, function() {
                if (this.id == id) {
                    app.contacts.current = this;
                    return;
                }
            });

            app.messages.load(id);

        },

        lock: function() {
            this._lock = true;
        },

        unLock: function() {
            this._lock = false;
        },

        remove: function (id) {

            var $contact = $('#nm-contact' + id),
                $counter = $contact.find('.counter');

            if ($counter.length) {
                alert(LANG_NEOMESSENGER_CONTACT_UNREAD_MSG);
            } else {

                var result = confirm(LANG_NEOMESSENGER_CONFIRM_CONTACT_DELETE);

                if (result) {

                    app.api.deleteContact(id , function(result) {

                        if (!result.error) {

                            for (var i = 0; i < app.contacts.contactsList.length; i++) {
                                if (app.contacts.contactsList[i].id == id) {
                                    app.contacts.contactsList.splice(i, 1);
                                    break;
                                }
                            }

                            $contact.slideUp(function() {

                                $(this).remove();

                                var selectContact = app.contacts.contactsList[0];

                                if (selectContact) {
                                    app.contacts.select(selectContact.id);
                                } else {
                                    $('.nm-content').hide();
                                    $('.nm-nomess').show();
                                }

                            });

                        } else {
                            console.log('Произошла ошибка при удалении контакта');
                            if (result.message) {
                                alert(result.message);
                            }
                        }

                    });

                }

            }

        },

        ignore: function (id) {

            var $contact = $('#nm-contact' + id),
                $counter = $contact.find('.counter');

            if ($counter.length) {
                alert(LANG_NEOMESSENGER_CONTACT_UNREAD_MSG);
            } else {

                var result = confirm(LANG_NEOMESSENGER_CONFIRM_CONTACT_IGNORE);

                if (result) {

                    app.api.ignoreContact(id, function (result) {

                        if (!result.error) {

                            var $contact = $('#nm-contact' + id);

                            for (var i = 0; i < app.contacts.contactsList.length; i++) {
                                if (app.contacts.contactsList[i].id == id) {
                                    app.contacts.contactsList.splice(i, 1);
                                    break;
                                }
                            }

                            $contact.slideUp(function () {

                                $(this).remove();

                                var selectContact = app.contacts.contactsList[0];

                                if (selectContact) {
                                    app.contacts.select(selectContact.id);
                                } else {
                                    $('.nm-content').hide();
                                    $('.nm-nomess').show();
                                }

                            });

                        } else {
                            console.log('Произошла ошибка при добавлении контакта в черный список');
                            if (result.message) {
                                alert(result.message);
                            }
                        }

                    });

                }
            }

        },

        forgive: function (id) {

            var result = confirm(LANG_NEOMESSENGER_CONFIRM_CONTACT_FORGIVE);

            if (result) {

                app.api.forgiveContact(id, function (result) {

                    if (!result.error) {

                        app.contacts.current.is_ignored = false;
                        app.contacts.select(id, true);
                        $('#nm-contact' + id).find('.nm-contact-ignored').remove();

                    }

                });

            }

        },

        top: function(id) {

            var $contact = $('#nm-contact' + id),
                $container = $contact.parent();

            $container.prepend($contact).scrollTop(0);

        },

        setCounter: function(id, count) {

            var $contact = $('#nm-contact' + id),
                $counter = $('.counter', $contact),
                old_count = 0;

            if ($counter.length) {
                old_count = parseInt($counter.attr('rel'));
                $counter.remove();
            }

            if (count > 0) {
                $contact.prepend('<span class="counter" rel="' + count + '">' + count + '</span>');
            }

            if (count > old_count) {
                this.top(id);
            }

        },

        setStatus: function(id, status) {

            var $contact = $('#nm-contact' + id);
            var $contactPanel = $('#nm-contact-panel');

            var $c_onlineIndicator = $contact.find('.nm-online-status');
            var $cp_info = $contactPanel.find('.nm-contact-info');

            if (status) {
                if (!$c_onlineIndicator.length) {
                    $c_onlineIndicator = $('<div/>', { 'class': 'nm-online-status' });
                    $contact.find('.nm-contact-image-wrap').prepend($c_onlineIndicator);
                }
                if (this.current && this.current.id == id) {
                    $cp_info.addClass('nm-online');
                }
            } else {
                if ($c_onlineIndicator.length) {
                    $c_onlineIndicator.remove();
                }
                if (this.current && this.current.id == id) {
                    $cp_info.removeClass('nm-online');
                }
            }

        },

        filter: function() {

            var query = $('#nm-search-inp').val().trim(),
                reg = new RegExp('^' + query.toUpperCase(), 'i');

            $('#nm-search-clr')[(query.length ? 'show' : 'hide')]();

            for (var i = 0; i < this.contactsList.length; i++) {
                var c = this.contactsList[i],
                    $contact = $('#nm-contact' + c.id),
                    nickname = c.nickname,
                    result = reg.test(nickname.toUpperCase());

                $contact['slide' + (result ? 'Down' : 'Up')]();
            }

        }

    };

    /* ------------------------------------------------------------------------- */

    // Сообщения
    this.messages = {

        _sendLock: false,
        oldLoading: false,
        lastId: 0,
        firstId: false,
        csrf_token: null,
        selected: [],

        load: function(id) {

            var self = app.messages;
            var previousID = app.contacts.previousID;

            if (previousID && $('#nm-editor').length) {
                app.editors[previousID] = $('#nm-editor').detach();
            }

            app.contacts.previousID = id;

            $('#nm-chat').unbind('scroll');
            $('#nm-right').html(app.templates.messagesLoading());

            this.older_id = false;
            this._sendLock = false;
            this.oldLoading = false;
            this.selected = [];

            app.isRefreshEnabled = false;
            app.contacts.lock();

            app.api.getMessages(id, function(result) {

                if (!result.error) {

                    var contact = app.contacts.current;

                    self.csrf_token = result.csrf_token;
                    var messages = result.messages;

                    $('#nm-right').html(app.templates.chatWrapper());
                    $('#nm-contact-panel').html(app.templates.contactPanel({ contact: contact }));

                    if (app.editors[id]) {
                        $('#nm-composer').append(app.editors[id]);
                    } else {
                        $('#nm-composer').html(app.htmlEditor);
                    }

                    app.editor.init();
                    app.editor.setValue(app.draft.get(id));

                    if (messages) {
                        self.older_id = messages[0].id;
                        $.each(messages, function () {
                            self.add(this);
                            if (this.id > self.lastId) {
                                self.lastId = this.id;
                            }
                        });

                        if (result.has_older) {
                            $('#nm-chat').bind('scroll', function () {
                                if ($(this).scrollTop() <= 5) self.oldLoad();
                            });
                        }
                    }

                    app.modal.onDimensions();

                    $('#nm-chat').waitForImages({
                        finished: function () {
                            self.scroll();
                        },
                        waitForAll: true
                    });

                    setTimeout(function() {
                        self.scroll();
                    });

                    if (app.recipientId > 0) {
                        app.editor.focus();
                        app.recipientId = 0;
                    }

                } else {
                    console.log('Произошла шибка при загрузке сообщений');
                    if (result.message) {
                        alert(result.message);
                    }
                }

                app.isRefreshEnabled = true;
                app.contacts.unLock();
                app.messages.setReaded();

            });

        },

        add: function(message, prepend) {

            var user = message.user;

            message.is_my = app.currentUser.id == message.from_id;
            message.is_new = message.is_new == 1 && app.currentUser.id != message.from_id;
            message.user = {
                avatar: app.isRetina ? user.avatar.small : user.avatar.micro,
                nickname: user.nickname
            };

            $('#nm-chat')[(prepend ? 'prepend' : 'append')](app.renderMessage(message));

        },

        oldLoad: function() {

            if (this.oldLoading) return;

            this.oldLoading = true;
            app.contacts.lock();

            var self = app.messages,
                $chat = $('#nm-chat');

            $chat.prepend('<div class="older-loading"></div>');

            app.api.moreMessages(app.contacts.current.id, self.older_id, function (result) {

                $chat.find('.older-loading').remove();

                if (!result.error) {

                    var oldFirstId = self.older_id;

                    if (result.messages) {

                        self.older_id = result.messages[result.messages.length - 1].id;

                        $.each(result.messages, function() {
                            self.add(this, true);
                        });

                        $chat.waitForImages({
                            finished: function() {
                                var pos = $chat.find('#nm-message-' + oldFirstId).position();
                                var panelH = $('#nm-contact-panel').outerHeight();
                                $chat.scrollTop($chat.scrollTop() + pos.top - panelH);
                            },
                            waitForAll: true
                        });
                    }

                    if (!result.has_older) {
                        $chat.unbind('scroll');
                    }

                } else {
                    console.log('Произошла ошибка при получении старых сообщений');
                    if (result.message) {
                        alert(result.message);
                    }
                }

                app.contacts.unLock();
                self.oldLoading = false;

            });

        },

        scroll: function() {

            $('#nm-chat').scrollTop($('#nm-chat')[0].scrollHeight);

        },

        send: function() {

            app.notificationsManager.notificationsClear();

            if (this._sendLock) { return; }

            var self = app.messages,
                $chat = $('#nm-chat'),
                to_id = app.contacts.current.id;

            var content = app.editor.getValue();

            if (!app.isMobile) {
                app.editor.focus();
            }

            if (!content) { return; }

            app.editor.setValue('');
            app.editor.disable();
            app.draft.del(to_id);

            app.contacts.top(to_id);
            self.sendLock();
            app.contacts.lock();
            app.isRefreshEnabled = false;

            var form_data = {
                contact_id: to_id,
                content: content,
                last_id: this.lastId,
                csrf_token: this.csrf_token
            };

            var tempMsgHtml = app.templates.message({
                temp: true,
                message: {
                    id: 'temp-msg',
                    is_my: true,
                    is_new: false,
                    content: '<div class="nm-temp-msg-loading"></div>',
                    user: {
                        avatar: app.isRetina ? app.currentUser.avatar.small : app.currentUser.avatar.micro,
                        nickname: app.currentUser.nickname
                    }
                }
            });

            $chat.append(tempMsgHtml);
            self.scroll();

            app.api.sendMessage(form_data, function (result) {

                var messages = result.messages;

                $chat.find('#nm-message-temp-msg').remove();

                app.editor.enable();

                if (!app.isMobile) {
                    app.editor.focus();
                }

                if (!result.error) {

                    if (messages) {

                        for (var i = 0; i < messages.length; i++) {
                            self.add(messages[i]);
                            if (messages[i].id > self.lastId) {
                                self.lastId = messages[i].id;
                            }
                        }

                        $chat.waitForImages({
                            finished: function() {
                                self.scroll();
                            },
                            waitForAll: true
                        });

                        setTimeout(self.scroll);
                    }

                } else {

                    if (result.message) {
                        alert(result.message);
                    } else {
                        console.log('Произошла ошибка при отправке сообщения');
                    }

                }

                self.setReaded();
                app.isRefreshEnabled = true;
                app.contacts.unLock();
                self.sendUnLock();

            });

        },

        setReaded: function() {

            var $contact = $('#nm-contact' + app.contacts.current.id),
                $counter = $('.counter', $contact),
                count = $counter.length ? parseInt($counter.attr('rel')) : 0;

            app.contacts.setCounter(app.contacts.current.id, 0);
            $('.conversation-item.item-left.new').removeClass('new');

            var newCount = app.messagesCount - count;

            app.setMessagesCounter(newCount);

            app.api.readMessages(app.contacts.current.id);

            if (app.isRefreshing) {
                app.abortRefresh = true;
            }

        },

        checkSelected: function () {

            var $chat = $('#nm-chat'),
                $selectedMsg = $chat.find('.conversation-item.nm-selected'),
                selectedMsgLength = $selectedMsg.length;

            app.messages.selected = [];

            if (selectedMsgLength) {
                $('#nm-contact-panel').html(app.templates.messagesPanel({ count: selectedMsgLength }));
                $selectedMsg.each(function() {
                    app.messages.selected.push($(this).attr('rel'));
                });
            } else {
                var contact = app.contacts.current;
                $('#nm-contact-panel').html(app.templates.contactPanel({ contact: contact }));
            }

        },

        cancelSelected: function() {

            var $chat = $('#nm-chat'),
                $selectedMsg = $chat.find('.conversation-item.nm-selected');

            if ($selectedMsg.length) {
                $selectedMsg.each(function() {
                    $(this).removeClass('nm-selected');
                });
            }

            app.messages.checkSelected();

            return false;

        },

        deleteMessages: function () {

            var selected = app.messages.selected,
                $chat = $('#nm-chat');

            if (selected.length) {
                app.api.deleteMessage(selected, function (result) {

                    app.messages.selected = [];

                    if (result.error) { return; }

                    var replace_func = function (id, delete_text) {
                        var $message = $('#nm-message-' + id, $chat);

                        $message
                            .removeClass('is_can_select nm-selected')
                            .find('.nm-message-text').hide()
                            .after('<span class="nm-message-delete-text">' + delete_text + '</span>');
                    };

                    if (result.message_ids) {
                        for (var key in result.message_ids) {
                            replace_func(result.message_ids[key], result.delete_text);
                        }
                    }

                    app.messages.checkSelected();

                });
            }

            return false;

        },

        restoreMessages: function(linkObj) {

            var $message = $(linkObj).closest('.conversation-item'),
                msg_id = $message.attr('rel');

            app.api.restoreMessage(msg_id, function (result) {

                if (result.error) { return; }

                $message.addClass('is_can_select').find('.nm-message-text').show();
                $message.find('.nm-message-delete-text').remove();

            });

        },

        sendLock: function() {

            this._sendLock = true;

        },

        sendUnLock: function() {

            this._sendLock = false;

        }

    };

    /* ------------------------------------------------------------------------- */

    this.draft = {

        update: function() {

            var text = app.editor.getValue();

            app.ls.set('nm_draft_' + app.currentUser.id + '_' + app.contacts.current.id, {text: text});

        },

        get: function(id) {

            return (app.ls.get('nm_draft_' + app.currentUser.id + '_' + id) || {})['text'] || '';

        },

        del: function(id) {

            app.ls.remove('nm_draft_' + app.currentUser.id + '_' + id);

        }

    };

    /* ------------------------------------------------------------------------- */

    // Модальное окно
    this.modal = {

        visible: false,
        metaContent: '',
        metaTheme: 'default',
        onDimensionsTimer: null,

        show: function() {

            var classes = [ 'nm-opened', app.isMobile ? ' nm-mobile' : '' ];

            $('html').addClass(classes.join(' '));

            var $metaTag = $('meta[name=viewport]');
            var $metaTagTheme = $('meta[name=theme-color]');

            if ($metaTag.length) {
                this.metaContent = $metaTag.attr('content');
            } else {
                $metaTag = $('<meta name="viewport" content="">').appendTo('head');
            }

            $metaTag.attr('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no');

            if ($metaTagTheme.length) {
                this.metaTheme = $metaTagTheme.attr('content');
            } else {
                $metaTagTheme = $('<meta name="theme-color" content="">').appendTo('head');
            }

            $metaTagTheme.attr('content', '#5580a3');

            var html = app.templates.mainModal({ soundEnabled: app.getSoundEnabled() });

            if ($('.mm-slideout').length) {
                $('.mm-slideout').append(html);
            } else {
                $('body').append(html);
            }

            this.$el = $('#nm-dialog');
            this.$bg = $('#nm-overlay');

            this.onDimensions();

            this.$el.fadeIn();
            this.$bg.trigger('nm_opened');

            app.widgetBtn.hide();

            this.visible = true;

        },

        hide: function() {

            var self = app.modal;
            var $metaTag = $('meta[name=viewport]');
            var $metaTagTheme = $('meta[name=theme-color]');

            var contactId = app.contacts.current.id;

            if (contactId && $('#nm-editor').length) {
                app.editors[contactId] = $('#nm-editor').detach();
            }

            this.$bg.trigger('nm_closed');
            this.$el.fadeOut(function() {

                var classes = [ 'nm-opened', app.isMobile ? ' nm-mobile' : '' ];

                $('html').removeClass(classes.join(' '));

                $('#nm-dialog').remove();
                self.$bg.remove();
                if ($metaTag.length) {
                    $metaTag.attr('content', self.metaContent);
                }
                if ($metaTagTheme.length) {
                    $metaTagTheme.attr('content', self.metaTheme);
                }

                app.widgetBtn.show();

            });

            app.editor.destroy();

            this.visible = false;

        },

        onDimensions: function() {

            var $contactPanel = $('#nm-contact-panel');

            var cpHeight = $contactPanel.outerHeight();

            var headerHeight = 38; // Высота заголовка
            var searchHeight = 49; // Высота поиска
            var controlsHeight = $('#nm-composer').is(':visible') ? $('#nm-composer').outerHeight() : 0;
            var windowW = $(window).width();
            var windowH = $(window).height();
            var modalH = app.modal.$el.height();
            var modalW = app.modal.$el.width();

            $('#nm-chat').css({
                height: modalH - headerHeight - controlsHeight - cpHeight
            });

            $('#nm-userlist').css({
                height: modalH - headerHeight - searchHeight
            });

            if (app.isMobile) return;

            var x = (windowH - modalH) / 2;
            var y = (windowW - modalW) / 2;

            app.modal.$el.css({
                top: x > 0 ? x : 0,
                left: y > 0 ? y : 0
            });

        }

    };

    /* ------------------------------------------------------------------------- */

    // Управление уведомлениями
    this.notificationsManager = (function () {

        var Notification = window.Notification || window.mozNotification || window.webkitNotification;

        var notifications = {};
        var nextSoundAt   = false;

        function start() {

            if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }

        }

        function notificationsClear () {

            $.each(notifications, function () {
                this.close();
            });

            notifications = {};

        }

        function notify (data) {

            if (!Notification || Notification.permission !== 'granted') { return; }

            try {

                var body = app.editor.cleanMessage(data.message);

                if (body) {

                    var notification = new Notification(data.title, {
                        body: body,
                        icon: data.image,
                        tag: data.tag
                    });

                    notification.onclick = function () {
                        notification.close();
                        window.focus();
                        notificationsClear();
                        app.contacts.select(data.contact_id);
                    };

                    notification.onclose = function () {
                        notificationsClear();
                    };

                    notifications[data.tag] = notification;

                }

            } catch (e) {
                console.log(e);
            }

        }

        function playSound () {

            if (!app.isPlaySound()) { return; }

            var now = +new Date();

            if (nextSoundAt && now < nextSoundAt) {
                return;
            }

            nextSoundAt = now + 1000;

            var audio = null;

            var soundsPath = app.options.root_url + 'static/neomessenger/sounds/';

            if (typeof Audio !== "undefined") {
                audio = new Audio(soundsPath + "notify.ogg");
                if (!audio.canPlayType('/audio/ogg')) {
                    audio = new Audio(soundsPath + "notify.mp3");
                }
                audio.play();
            }

            app.ls.set('lastMessageSounded', app.lastUnreadMessageId);

        }

        return {
            start: start,
            notify: notify,
            playSound: playSound,
            notificationsClear: notificationsClear
        }

    })();

    /* ------------------------------------------------------------------------- */

    // LocalStorage
    this.ls = {

        supported: function() {
            return (window.localStorage !== undefined && window.JSON !== undefined);
        },

        set: function(key, val) {
            this.remove(key);
            try {
                return this.supported() ? localStorage.setItem(key, JSON.stringify(val)) : false;
            } catch (e) {
                return false;
            }
        },

        get: function(key) {
            try {
                return this.supported() ? JSON.parse(localStorage.getItem(key)) : false;
            } catch (e) {
                return false;
            }
        },

        remove: function(key) {
            try { localStorage.removeItem(key); } catch(e) {}
        }

    };

    /* ------------------------------------------------------------------------- */

    return this;

}).call(icms.neomessenger || {}, jQuery);
