// Array.prototype polifill
(function (window, Array) {
    if (!Array.prototype.map) {
        Array.prototype.map = function (call, thisArg) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            var _this = thisArg === undefined ? window : thisArg
            var res = []
            for (var i = 0; i < this.length; i++) {
                var e = this[i];
                res.push(call.call(_this, e, i, this))
            }
            return res
        }
    }

    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (call, thisArg) {
            this.map(call, thisArg)
        }
    }

    if (!Array.prototype.filter) {

        Array.prototype.filter = function (call, thisArg) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            var _this = thisArg === undefined ? window : thisArg
            var res = []
            for (var i = 0; i < this.length; i++) {
                var e = this[i];
                if (call.call(_this, e, i, this) === true) {
                    res.push(e)
                }
            }
            return res
        }
    }

    if (!Array.prototype.find) {
        Array.prototype.find = function (call, thisArg) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            var _this = thisArg === undefined ? window : thisArg
            var res = undefined

            for (var i = 0; i < this.length; i++) {
                var e = this[i];
                if (call.call(_this, e, i, this)) {
                    res = e
                    break
                }
            }
            return res
        }
    }

    if (!Array.prototype.every) {
        Array.prototype.every = function (call, thisArg) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            var _this = thisArg === undefined ? window : thisArg
            var res = true

            for (var i = 0; i < this.length; i++) {
                var e = this[i];
                if (!call.call(_this, e, i, this)) {
                    res = false
                    break
                }
            }
            return res
        }
    }

    if (!Array.prototype.some) {
        Array.prototype.some = function (call, thisArg) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            var _this = thisArg === undefined ? window : thisArg
            var res = false

            for (var i = 0; i < this.length; i++) {
                var e = this[i];
                if (call.call(_this, e, i, this)) {
                    res = true
                    break
                }
            }
            return res
        }
    }

    if (!Array.prototype.flat) {

        Array.prototype.flat = function (depth) {

            if (depth && typeof depth !== 'number') throw 'type error : flat need number'
            return flat(this, depth ? depth : 1)
        }

        function flat(arr, depth) {
            if (depth <= 0) return arr
            if (!arr.some(function (a) { return a instanceof Array })) return arr

            var res = []

            arr.forEach(function (a) {
                if (a instanceof Array) {
                    a.forEach(function (v) { res.push(v) })
                } else {
                    res.push(a)
                }
            })

            return flat(res, depth--)
        }
    }

    if (!Array.prototype.reduce) {

        Array.prototype.reduce = function (call, init) {
            if (typeof call !== 'function') throw new TypeError("not a function")

            if (arguments.length > 1) {
                var res = init
                for (var i = 0; i < this.length; i++) {
                    var e = this[i];
                    res = call(res, e, i, this)
                }
                return res
            } else {
                if (this.length < 1) throw 'Reduce of empty array with no initial value'
                var res = this[0]
                for (var i = 1; i < this.length; i++) {
                    var e = this[i];
                    res = call(res, e, i, this)
                }
                return res
            }
        }
    }
})(window, Array);
// Promise polyfill
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (factory());
}(this, (function () {
    'use strict';

    /**
     * @this {Promise}
     */
    function finallyConstructor(callback) {
        var constructor = this.constructor;
        return this.then(
            function (value) {
                return constructor.resolve(callback()).then(function () {
                    return value;
                });
            },
            function (reason) {
                return constructor.resolve(callback()).then(function () {
                    return constructor.reject(reason);
                });
            }
        );
    }

    // Store setTimeout reference so promise-polyfill will be unaffected by
    // other code modifying setTimeout (like sinon.useFakeTimers())
    var setTimeoutFunc = setTimeout;

    function noop() { }

    // Polyfill for Function.prototype.bind
    function bind(fn, thisArg) {
        return function () {
            fn.apply(thisArg, arguments);
        };
    }

    /**
     * @constructor
     * @param {Function} fn
     */
    function Promise(fn) {
        if (!(this instanceof Promise))
            throw new TypeError('Promises must be constructed via new');
        if (typeof fn !== 'function') throw new TypeError('not a function');
        /** @type {!number} */
        this._state = 0;
        /** @type {!boolean} */
        this._handled = false;
        /** @type {Promise|undefined} */
        this._value = undefined;
        /** @type {!Array<!Function>} */
        this._deferreds = [];

        doResolve(fn, this);
    }

    function handle(self, deferred) {
        while (self._state === 3) {
            self = self._value;
        }
        if (self._state === 0) {
            self._deferreds.push(deferred);
            return;
        }
        self._handled = true;
        Promise._immediateFn(function () {
            var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
            if (cb === null) {
                (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
                return;
            }
            var ret;
            try {
                ret = cb(self._value);
            } catch (e) {
                reject(deferred.promise, e);
                return;
            }
            resolve(deferred.promise, ret);
        });
    }

    function resolve(self, newValue) {
        try {
            // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
            if (newValue === self)
                throw new TypeError('A promise cannot be resolved with itself.');
            if (
                newValue &&
                (typeof newValue === 'object' || typeof newValue === 'function')
            ) {
                var then = newValue.then;
                if (newValue instanceof Promise) {
                    self._state = 3;
                    self._value = newValue;
                    finale(self);
                    return;
                } else if (typeof then === 'function') {
                    doResolve(bind(then, newValue), self);
                    return;
                }
            }
            self._state = 1;
            self._value = newValue;
            finale(self);
        } catch (e) {
            reject(self, e);
        }
    }

    function reject(self, newValue) {
        self._state = 2;
        self._value = newValue;
        finale(self);
    }

    function finale(self) {
        if (self._state === 2 && self._deferreds.length === 0) {
            Promise._immediateFn(function () {
                if (!self._handled) {
                    Promise._unhandledRejectionFn(self._value);
                }
            });
        }

        for (var i = 0, len = self._deferreds.length; i < len; i++) {
            handle(self, self._deferreds[i]);
        }
        self._deferreds = null;
    }

    /**
     * @constructor
     */
    function Handler(onFulfilled, onRejected, promise) {
        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
        this.promise = promise;
    }

    /**
     * Take a potentially misbehaving resolver function and make sure
     * onFulfilled and onRejected are only called once.
     *
     * Makes no guarantees about asynchrony.
     */
    function doResolve(fn, self) {
        var done = false;
        try {
            fn(
                function (value) {
                    if (done) return;
                    done = true;
                    resolve(self, value);
                },
                function (reason) {
                    if (done) return;
                    done = true;
                    reject(self, reason);
                }
            );
        } catch (ex) {
            if (done) return;
            done = true;
            reject(self, ex);
        }
    }

    Promise.prototype['catch'] = function (onRejected) {
        return this.then(null, onRejected);
    };

    Promise.prototype.then = function (onFulfilled, onRejected) {
        // @ts-ignore
        var prom = new this.constructor(noop);

        handle(this, new Handler(onFulfilled, onRejected, prom));
        return prom;
    };

    Promise.prototype['finally'] = finallyConstructor;

    Promise.all = function (arr) {
        return new Promise(function (resolve, reject) {
            if (!arr || typeof arr.length === 'undefined')
                throw new TypeError('Promise.all accepts an array');
            var args = Array.prototype.slice.call(arr);
            if (args.length === 0) return resolve([]);
            var remaining = args.length;

            function res(i, val) {
                try {
                    if (val && (typeof val === 'object' || typeof val === 'function')) {
                        var then = val.then;
                        if (typeof then === 'function') {
                            then.call(
                                val,
                                function (val) {
                                    res(i, val);
                                },
                                reject
                            );
                            return;
                        }
                    }
                    args[i] = val;
                    if (--remaining === 0) {
                        resolve(args);
                    }
                } catch (ex) {
                    reject(ex);
                }
            }

            for (var i = 0; i < args.length; i++) {
                res(i, args[i]);
            }
        });
    };

    Promise.resolve = function (value) {
        if (value && typeof value === 'object' && value.constructor === Promise) {
            return value;
        }

        return new Promise(function (resolve) {
            resolve(value);
        });
    };

    Promise.reject = function (value) {
        return new Promise(function (resolve, reject) {
            reject(value);
        });
    };

    Promise.race = function (values) {
        return new Promise(function (resolve, reject) {
            for (var i = 0, len = values.length; i < len; i++) {
                values[i].then(resolve, reject);
            }
        });
    };

    // Use polyfill for setImmediate for performance gains
    Promise._immediateFn =
        (typeof setImmediate === 'function' &&
            function (fn) {
                setImmediate(fn);
            }) ||
        function (fn) {
            setTimeoutFunc(fn, 0);
        };

    Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
        if (typeof console !== 'undefined' && console) {
            console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
        }
    };

    /** @suppress {undefinedVars} */
    var globalNS = (function () {
        // the only reliable means to get the global object is
        // `Function('return this')()`
        // However, this causes CSP violations in Chrome apps.
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('unable to locate global object');
    })();

    if (!('Promise' in globalNS)) {
        globalNS['Promise'] = Promise;
    } else if (!globalNS.Promise.prototype['finally']) {
        globalNS.Promise.prototype['finally'] = finallyConstructor;
    }

})));


//通用类库
//依赖 jquery
//依赖 miniui
(function (window, $) {
    var _mycommon = {
        guidempty: "00000000-0000-0000-0000-000000000000",
        //源window，主要用于多个页面之间的通信
        sourceWin: "",
        //页面管理
        pageManager: {
            pageIdField: '_setpageid',
            getId: function () {
                return 'id' + Math.random();
            },
            id: (function () {
                var pageIdField = '_setpageid';
                var id;
                var urlArr = location.href.split('?');
                if (urlArr.length > 1) {
                    var params = urlArr[1].split('&');
                    if (params.length > 0) {
                        for (var key = 0; key < params.length; key++) {
                            var kv = params[key].split('=');
                            if (kv[0] == pageIdField) {
                                id = kv[1];
                            }
                        }
                    }
                }

                if (!id) {
                    id = 'id' + Math.random();
                }
                return id;
            })()
        },
        //事件管理
        eventManager: {
            registerEvents: [],
            addEvent: function (name, fn) {
                var root = window.top._mycommon;
                var length = root.eventManager.registerEvents.length;
                var exist = false;
                for (var i = 0; i < length; i++) {
                    var item = root.eventManager.registerEvents[i];
                    if (item.name === name) {
                        item.fn = fn;
                        exist = true;
                        break;
                    }
                }
                if (exist == false) {
                    root.eventManager.registerEvents.push({ 'name': name, 'fn': fn });
                }

            },
            triggerEvent: function (name, data) {
                var root = window.top._mycommon;

                var backdata;
                if (root && root.eventManager.registerEvents.length > 0) {
                    var arr = root.eventManager.registerEvents;
                    for (var i = 0; i < arr.length; i++) {
                        var item = arr[i];
                        if (item.name === name && item.fn) {
                            try {
                                backdata = item.fn(data);
                            } catch (e) {
                                arr.splice(i, 1);
                                if (console) {
                                    console.log("事件" + item.name + "失效，因为window释放了。异常的信息：" + e);
                                }
                            }
                            break;
                        }
                    }
                }

                return backdata;

            }
        },
        //http请求管理
        ajax: function (options) {
            var self = this;

            var defaultOptions = {
                url: "",
                data: '',
                protocol: "",
                success: "",
                error: "",
                type: "post",
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8;',
                dataType: 'json',
                beforeSend: "",
                async: true,
                complete: '',
                timeout: 0,
                cache: false,
                crossDomain: true,
                statusCode: "",
                dataFilter: "",
                traditional: true,
                //custom logic error handle
                logicerror: "",
                //hasscreen
                loadingicon: false
            };
            //support cors in ie8
            if ($.support && $.support.cors != true) {
                $.support.cors = true;
            }
            if (options.data && options.data === undefined) {
                options.data = "";
            }
            $.extend(defaultOptions, options);

            if (defaultOptions.type == 'get') {
                var protocol = {};
                //to do 判断是否为无效数据类型

                if (self.tools.type.IsString(defaultOptions.data) || self.tools.type.IsBoolean(defaultOptions.data) || self.tools.type.IsNumber(defaultOptions.data)) {
                    protocol = defaultOptions.data;
                }
                else if (self.tools.type.IsArray(defaultOptions.data)) {
                    protocol = JSON.stringify(defaultOptions.data);
                }
                else {
                    for (var key in defaultOptions.data) {
                        if (!defaultOptions.data.hasOwnProperty(key)) continue;

                        if (self.tools.type.IsUndefined(defaultOptions.data[key]) || self.tools.type.IsFunction(defaultOptions.data[key])) {
                            alert(key + ":" + defaultOptions.data[key]);
                            //to do log
                            return;
                        }

                        //服务器端默认只会解析简单结构的json
                        if (self.tools.type.IsObject(defaultOptions.data[key]) || self.tools.type.IsArray(defaultOptions.data[key])) {
                            protocol[key] = JSON.stringify(defaultOptions.data[key]);
                        } else {
                            protocol[key] = defaultOptions.data[key];
                        }
                    }
                }
                defaultOptions.protocol = protocol;

            } else if (defaultOptions.type == 'post') {
                var protocol = {};
                //to do 判断是否为无效数据类型

                if (self.tools.type.IsString(defaultOptions.data) || self.tools.type.IsBoolean(defaultOptions.data) || self.tools.type.IsNumber(defaultOptions.data)) {
                    protocol = defaultOptions.data;
                }
                else if (self.tools.type.IsArray(defaultOptions.data)) {
                    protocol = JSON.stringify(defaultOptions.data);
                }
                else {
                    for (var key in defaultOptions.data) {
                        if (!defaultOptions.data.hasOwnProperty(key)) continue;

                        //if (self.tools.type.IsUndefined(defaultOptions.data[key]) || self.tools.type.IsFunction(defaultOptions.data[key])) {
                        //    alert(key + ":" + defaultOptions.data[key]);
                        //    //to do log
                        //    return;
                        //}

                        //服务器端默认只会解析简单结构的json
                        if (self.tools.type.IsObject(defaultOptions.data[key]) || self.tools.type.IsArray(defaultOptions.data[key])) {
                            protocol[key] = JSON.stringify(defaultOptions.data[key]);
                        } else {
                            protocol[key] = defaultOptions.data[key];
                        }
                    }
                }
                defaultOptions.protocol = protocol;
            }

            return $.ajax({

                type: defaultOptions.type,
                url: defaultOptions.url,
                data: defaultOptions.protocol,
                contentType: defaultOptions.contentType,
                dataType: defaultOptions.dataType,
                cache: defaultOptions.cache,
                async: defaultOptions.async,
                traditional: defaultOptions.traditional,
                crossDomain: defaultOptions.crossDomain,
                timeout: defaultOptions.timeout,
                dataFilter: function (data, type) {
                    if (defaultOptions.dataFilter) {
                        return defaultOptions.dataFilter(data, type);
                    } else {
                        return data;
                    }
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                    if (defaultOptions.beforeSend) defaultOptions.beforeSend(xhr);
                },
                success: function (data, textStatus, jqxhr) {
                    //defaultConfig.validate(data.code);

                    //if (data.code == 0 ) {
                    //if (data.success == 0) {
                    if (defaultOptions.success) defaultOptions.success(data, textStatus);
                    //    } 
                    //} else {
                    //if (!defaultOptions.logicerror) {
                    //    defaultConfig.exception("错误代码：[" + data.code + "]</br><b>错误信息: </b>" + data.message);
                    //} else {
                    //    defaultOptions.logicerror(data);
                    //}
                    //}
                },
                complete: function (xhr, textStatus) {
                    //dispose xhr
                    xhr = null;

                    //close waload
                    //close waload
                    //if (defaultOptions.loadingicon && defaultOptions.async) {
                    //    _parent.hideLoading();
                    //}

                    if (defaultOptions.complete) defaultOptions.complete(textStatus);
                },
                error: function (xhr, textStatus, errorThrown) {


                    //close waload
                    //if (defaultOptions.loadingicon && defaultOptions.async) {
                    //    _parent.hideLoading();
                    //}

                    if (defaultOptions.error) {
                        defaultOptions.error(xhr, textStatus, errorThrown)
                    }
                    else {
                        try {
                            var r = JSON.parse(xhr.responseText);
                            self.tips.prompt(r.message);
                        } catch (e) {
                            self.tips.prompt('server error！' + textStatus + ", " + errorThrown.msg);
                        }
                    }
                    //    defaultOptions.error(textStatus, errorThrown, $.wckj.getAjaxErrorInfo(textStatus, errorThrown));
                    //else
                    //    $.wckj.alerterror('server error！' + textStatus + ", " + errorThrown.msg);
                    //dispose xhr
                    xhr = null;
                }
            });

        },
        //表单管理
        formManager: {
            /*
            [{name:'',data:''}]
            */
            cache: [],
            defaultName: "_autodataname",
            filter: "class",
            filterValue: "bd_",
            customAttr: 'bdval',
            setData: function (o, name) {
                if (!o) return;
                var self = this;
                var root = _mycommon;
                self.setCache(o, name);

                var t = $('[' + self.filter + '*="' + self.filterValue + '"]');
                var cache = {};//对重复name处理结果进行缓存
                $.each(t, function () {
                    var obj = $(this);
                    var arrnamestr = obj.attr(self.filter);
                    var name;
                    var arr = arrnamestr.split(" ");
                    for (var v = 0; v < arr.length; v++) {
                        if (arr[v].indexOf(self.filterValue) >= 0) {
                            name = arr[v];
                        }
                    }

                    //获取相同name的元素数量
                    var sameNameElements = [];
                    for (var n = 0; n < t.length; n++) {
                        var citem = $(t[n]);
                        if (citem.hasClass(name) === true) {
                            sameNameElements.push(citem);
                        }
                    }
                    if (!cache[name] && sameNameElements.length > 1) {
                        cache[name] = 1;
                    }

                    var value = self.multLevelData(o, name);

                    //赋值
                    //默认只有radio,checkbox可以name重复
                    if (cache[name] && cache[name] == 1) {
                        var innercache;

                        for (var i = 0; i < sameNameElements.length; i++) {
                            var item = sameNameElements[i];

                            if (item.attr("type") == "radio" || item.attr("type") == "checkbox") {
                                var typename = item.attr('type');
                                if (innercache && innercache != typename) {
                                    throw new Error('同名name只能绑定同类型的input,如：checkbox，radio，绑定名称：' + name);
                                }
                                innercache = typename;

                            } else {
                                throw new Error('同名name只能绑定同类型的input,如：checkbox，radio，绑定名称：' + name);

                            }
                            if (root.tools.type.IsArray(value)) {
                                for (var f = 0; f < value.length; f++) {
                                    var s = value[f];
                                    var v = self.getHtmlTagValue(item);
                                    if (v == s) {
                                        item.attr("checked", "checked");
                                    }
                                }
                            } else {
                                var v = self.getHtmlTagValue(item);
                                if (v == value) {
                                    if (item.attr("type") == 'radio') {
                                        item.attr("checked", "true");
                                        break;
                                    }
                                }
                            }
                        }

                        cache[name] += 1;
                    } else {
                        //miniui系列
                        if (obj.hasClass("mini-datagrid") || obj.hasClass("mini-treegrid") || obj.hasClass("mini-tree")) {
                            var id = obj.attr('id');
                            var c = mini.get(id);
                            c.setData(value);
                        }
                        else if (obj.attr("class") && obj.attr("class").indexOf('mini-') >= 0) {
                            var id = obj.attr('id');
                            if (!id) {
                                throw new Error('在miniui中使用bd_模板必须有id，绑定名称：' + name);
                            }
                            var c = mini.get(id);
                            c.setValue(value);
                        }
                        //原生html
                        else if (obj.is('input')) {
                            if (obj.attr('type') == 'checkbox') {
                                var v = self.getHtmlTagValue(obj);
                                if (value == v) {
                                    obj.attr('checked', true);
                                } else {
                                    obj.attr('checked', false);
                                }
                            } else {
                                obj.val(value);
                            }
                        }
                        else {
                            if (root.tools.type.IsNull(value) == false) {
                                obj.text(value);
                            }

                        }
                    }
                });

                //缓存处理
                self.setCurrentCache(self.getData(name), name);
            },
            //缓存处理
            setCache: function (o, name) {
                var self = this;

                //缓存处理
                if (!name) name = self.defaultName;
                var item = _mycommon.tools.array.has(self.cache, function (item) {
                    return item.name == name;
                });
                if (item) {
                    item.data = o;
                } else {
                    self.cache.push({ name: name, data: o });
                }
            },
            //设置快照
            setCurrentCache: function (o, name) {
                var self = this;

                //缓存处理
                if (!name) name = self.defaultName;
                var item = _mycommon.tools.array.has(self.cache, function (item) {
                    return item.name == name;
                });
                if (item) {
                    item.currentData = JSON.stringify(o).trim();
                } else {
                    self.cache.push({ name: name, currentData: JSON.stringify(o) });
                }
            },
            //获取快照
            getCurrentCache: function (name) {
                var self = this;

                //缓存处理
                if (!name) name = self.defaultName;
                var item = _mycommon.tools.array.has(self.cache, function (item) {
                    return item.name == name;
                });
                return item.currentData;
            },
            //缓存与表单数据合并
            getCache: function (o, name) {
                var resultdata;
                var self = this;

                //缓存处理
                if (!name) name = self.defaultName;
                var item = _mycommon.tools.array.has(self.cache, function (item) {
                    return item.name == name;
                });
                if (item) {
                    resultdata = $.extend(item.data, o);
                } else {
                    resultdata = o;
                }
                return resultdata;
            },
            //对比之前缓存和现在页面的数据
            isChange: function (name) {
                var self = this;
                //缓存处理
                if (!name) name = self.defaultName;
                var cdata = self.getCurrentCache(name);
                if (cdata.replace(/\"/g, "") == JSON.stringify(self.getData(name)).trim().replace(/\"/g, "")) {
                    return false;
                } else {
                    return true;
                }
            },
            multLevelData: function (o, str) {
                var arr = str.split('_');
                var value;
                //多级数据结构处理
                if (arr.length > 2) {
                    if (arr.length == 3) {
                        value = o[arr[1]][arr[2]];
                    } else
                        if (arr.length == 4) {
                            value = o[arr[1]][arr[2]][arr[3]];
                        }
                } else {
                    value = o[arr[1]];
                }
                return value;
            },
            multLevelName: function (o, str, value) {
                var arr = str.split('_');

                //多级数据结构处理
                if (arr.length > 2) {
                    if (arr.length == 3) {
                        if (!o[arr[1]]) {
                            o[arr[1]] = {};
                        }
                        o[arr[1]][arr[2]] = value;
                    } else if (arr.length == 4) {
                        if (!o[arr[1]]) {
                            o[arr[1]] = {};
                        }
                        if (!o[arr[2]]) {
                            o[arr[2]] = {};
                        }
                        o[arr[1]][[arr[2]]][[arr[3]]] = value;
                    }
                } else {
                    o[arr[1]] = value;
                }

            },
            getData: function (name) {
                var self = this;
                var root = _mycommon;
                var o = {};

                var t = $('[' + self.filter + '*=' + self.filterValue + ']');
                $.each(t, function () {
                    var obj = $(this);
                    var arrnamestr = obj.attr(self.filter);
                    var cache = {};//对重复name处理结果进行缓存
                    var name;

                    var arr = arrnamestr.split(" ");
                    for (var v = 0; v < arr.length; v++) {
                        if (arr[v].indexOf(self.filterValue) >= 0) {
                            name = arr[v];
                        }
                    }

                    //获取相同name的元素数量
                    var sameNameElements = [];
                    for (var n = 0; n < t.length; n++) {
                        var citem = $(t[n]);
                        if (citem.hasClass(name) === true) {
                            sameNameElements.push(citem);
                        }
                    }
                    if (!cache[name] && sameNameElements.length > 1) {
                        cache[name] = 1;
                    }

                    //
                    if (cache[name] && cache[name] == 1) {
                        var innercache;
                        var temp = [];
                        for (var i = 0; i < sameNameElements.length; i++) {
                            var item = sameNameElements[i];

                            if (item.attr("type") == "radio" || item.attr("type") == "checkbox") {
                                var typename = item.attr('type');
                                if (innercache && innercache != typename) {
                                    throw new Error('同名name只能绑定同类型的input,如：checkbox，radio');
                                }
                                innercache = typename;

                            } else {
                                throw new Error('同名name只能绑定同类型的input,如：checkbox，radio');
                            }

                            if (item.attr("type") == "radio") {
                                if (item[0].checked === true) {
                                    var v = self.getHtmlTagValue(item);
                                    self.multLevelName(o, name, v);
                                    break;
                                }
                            } else if (item.attr("type") == "checkbox") {
                                if (item[0].checked === true) {
                                    var v = self.getHtmlTagValue(item);
                                    temp.push(v);
                                }
                            }
                        }

                        if (innercache == "checkbox") {
                            self.multLevelName(o, name, temp);
                        }

                        cache[name] += 1;
                    } else {
                        //miniui系列
                        if (obj.hasClass("mini-datagrid") || obj.hasClass("mini-treegrid") || obj.hasClass("mini-tree")) {
                            var id = obj.attr('id');
                            var c = mini.get(id);
                            self.multLevelName(o, name, c.getData());
                        }
                        else if (obj.hasClass('mini-datepicker')) {
                            var id = obj.attr('id');
                            if (!id) {
                                throw new Error('在miniui中使用bd_模板必须有id');
                            }
                            var c = mini.get(id);
                            var date = "";
                            if (c.getFormValue()) {
                                //格式化date格式，兼容ie
                                var newDate = new Date(c.getFormValue().replace(/-/g, "/"));
                                date = _mycommon.tools.dateFormat(newDate, 'yyyy-MM-dd hh:mm:ss')
                            }
                            self.multLevelName(o, name, date);
                        }
                        else if (obj.attr("class") && obj.attr("class").indexOf('mini-') >= 0) {
                            var id = obj.attr('id');
                            if (!id) {
                                throw new Error('在miniui中使用bd_模板必须有id');
                            }
                            var c = mini.get(id);
                            self.multLevelName(o, name, c.getValue());
                        }
                        //原生html
                        else if (obj.is('input') || obj.is('textarea')) {
                            if (obj.attr('type') == 'checkbox') {
                                var v = self.getHtmlTagValue(obj);
                                if (obj[0].checked === true) {
                                    self.multLevelName(o, name, v);
                                } else {
                                    self.multLevelName(o, name, "0");
                                }
                            } else {
                                self.multLevelName(o, name, obj.val());
                            }
                        }
                        else {
                            self.multLevelName(o, name, obj.text());
                        }
                    }
                });
                //与缓存合并
                var d = self.getCache(o, name);
                return d;
            },
            //获取标准元素的值
            getHtmlTagValue: function (dom) {
                var self = this;
                var root = _mycommon;
                var v;
                if (dom.attr("type") == "radio" || dom.attr("type") == "checkbox") {
                    if (root.tools.type.IsUndefined(dom.attr(self.customAttr)) === false) {
                        v = dom.attr(self.customAttr);
                    } else {
                        throw new Error("原生radio,checkbox必须使用" + self.customAttr + "绑定数据");

                    }
                } else {
                    v = dom.val();
                }

                return v;
            }


        },
        //弹窗管理
        dialogManager: {
            win: "",
            miniWin: [],
            findParentWinWithMiniui: function () {
                var self = this;
                return window.top;
            },
            open: function (options) {
                var self = this;
                var root = _mycommon;
                var pageid = _mycommon.pageManager.getId();
                if (options.data && _mycommon.tools.type.IsObject(options.data) == false) {
                    throw new Error('data数据只能支持object');
                }

                self.win = this.findParentWinWithMiniui(window);

                var defaultOptions = {
                    title: '',
                    url: '',
                    showModal: true,
                    width: 1100,
                    height: 600,
                    data: "",
                    showMaxButton: true
                };

                //url params
                if (options.data) {

                    options.url = root.tools.url.merge(options.url, options.data);

                    //提供id，方便区分页面(虽然miniui也设置了。。)
                    options.url += '&' + _mycommon.pageManager.pageIdField + '=' + pageid;
                } else {
                    var search = '?';
                    if (options.url.indexOf('?') >= 0) {
                        search = '&';
                    }

                    //提供id，方便区分页面(虽然miniui也设置了。。)
                    options.url += search + _mycommon.pageManager.pageIdField + '=' + pageid;
                }

                $.extend(defaultOptions, options);

                var miniwin = self.win.mini.open(defaultOptions);

                self.win._mycommon.dialogManager.setMiniWin({ id: pageid, miniwin: miniwin });

                self.win._mycommon.dialogManager.setSourceWin(window);

                return miniwin;
            },
            getData: function () {
                return _mycommon.getUrlParams(location.href);
            },
            close: function (action) {
                var topwindow = this.findParentWinWithMiniui(window);
                var arr = topwindow._mycommon.dialogManager.miniWin;
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].id == _mycommon.pageManager.id) {
                        // window.close();
                        arr[i].miniwin.hide();
                        break;
                    }
                }

            },
            setMiniWin: function (miniWin) {
                this.miniWin.push(miniWin);
            },
            setSourceWin: function (sourceWin) {
                _mycommon.sourceWin = sourceWin;
            },

            getSourceWin: function () {
                //有坑
                //如果是多个弹窗交互使用时，这个方法返回的永远是最后弹窗的源win
                //解决方案：每个win都用page_id标记存起来，查找根据当前弹窗的url的page_id反查
                //to do
                var topwindow = this.findParentWinWithMiniui(window);
                return topwindow._mycommon.sourceWin;
            }


        },
        //提示框
        tips: {
            /*
            消息提示弹窗及确认弹窗方法
            2019.1.17罗凯新增
            */
            msgBoxHtml: '',
            confirmHtml: '',
            //定义页面提示框位置重定位函数(方法内部使用，不做外部调用)
            relocation: function () {
                var clientWidth = document.documentElement.clientWidth; //屏幕宽
                var clientHeight = document.documentElement.clientHeight; //屏幕高
                var totalHeight = 0;
                var oy = 60;
                var ty = oy;
                var tipBoxs = $(".msgBox");
                var g = [];
                $.each(tipBoxs, function (i, b) {
                    var boxWidth = $(b).outerWidth();
                    var boxHeight = $(b).outerHeight();
                    if (ty + boxHeight > clientHeight) {
                        ty = oy;
                    }
                    $(b).css("left", (clientWidth - boxWidth) / 2 + "px");
                    $(b).css("top", ty + "px");
                    ty = ty + boxHeight;
                });
            },
            /* 从这开始的方法为内部使用，不做外部调用*/
            /* 获取普通消息提示框
            type:消息提示弹窗类型
            content:提示内容
            title:提示标题
            */
            getMsgBox: function (type, content, title) {
                if (window.self != window.top) {
                    var w = window.top._mycommon;
                    w.tips.getMsgBox(type, content, title);
                }
                else {
                    var self = this;
                    //var def = self.getMsgBox();
                    var def = $.Deferred();
                    if (self.msgBoxHtml == '') {
                        var selfUrl = '/custom-tips-msgbox.html';
                        _mycommon.ajax({
                            type: 'get', url: selfUrl, dataType: "html"
                        }).done(function (html) {
                            var b = $(html);
                            if ($.browser.version < 9) {
                                b.css("border", "1px solid #999999");
                            }
                            self.msgBoxHtml = b.prop("outerHTML");
                            def.resolve(b);
                        });
                    }
                    else {
                        var b = $(self.msgBoxHtml);
                        def.resolve(b);
                    }
                    def.then(function (box) {
                        var iconUrl = "";
                        switch (type) {
                            case "alert":
                                iconUrl = "../image/tips-icon-alert.png";
                                break;
                            case "warn":
                                iconUrl = "../image/tips-icon-warn.png";
                                break;
                            case "error":
                                iconUrl = "../image/tips-icon-error.png";
                                break;
                        }
                        box.find(".content .icon img").removeAttr("src").attr("src", iconUrl);
                        $("body").append(box);//向页面添加提示框

                        /*判断是否有标题，从而加载弹窗主体高度*/
                        var topTitle = box.find(".topTitle");
                        var boxContent = box.find(".content");
                        boxContent.find(".text div").text(content);
                        if (_mycommon.tools.type.IsUndefined(title)) {
                            topTitle.hide();
                            boxContent.outerHeight(box.outerHeight());
                        }
                        else {
                            topTitle.text(title);
                            boxContent.outerHeight(box.outerHeight() - topTitle.outerHeight());
                        }
                        boxContent.find(".text div").css("max-height", boxContent.height());
                        self.relocation();//提示弹窗初次记载时需要对页面所有提示弹窗进行重定位
                        //设置提示弹窗自动关闭
                        var int = setTimeout(function () {
                            clearTimeout(int);
                            box.animate({ opacity: '0', top: '0' }, 'slow', function () {
                                box.remove();
                            });
                            self.relocation();
                        }, 3000);
                    });
                }
            },
            /* 获取确认消息提示框
            type:消息提示弹窗类型
            content:提示内容
            title:提示标题
            */
            getConfirmBox: function (type, content, title) {
                if (window.self != window.top) {
                    var w = window.top._mycommon;
                    var d = w.tips.getConfirmBox(type, content, title);
                    return d;
                }
                else {
                    var self = this;
                    var def = $.Deferred();
                    if (self.confirmHtml == '') {
                        var selfUrl = '/custom-tips-confirm.html';
                        _mycommon.ajax({
                            type: 'get', url: selfUrl, dataType: "html"
                        }).done(function (html) {
                            var b = $(html);
                            var box = b.filter(".custom-tips.confirm");
                            if ($.browser.version < 9) {
                                box.css("border", "1px solid #999999");
                            }
                            self.confirmHtml = b.prop("outerHTML");
                            def.resolve(b);
                        });
                    }
                    else {
                        var b = $(self.confirmHtml);
                        def.resolve(b);
                    }
                    var newdef = $.Deferred();
                    def.then(function (b) {
                        //遮罩层
                        var cover = b.filter(".custom-confirm-cover");
                        var box = b.filter(".custom-tips.confirm");
                        $("body").append(cover);//向页面添加遮罩层
                        $("body").append(box);//向页面添加确认提示框
                        /*判断是否有标题，从而加载弹窗主体高度*/
                        var topTitle = box.find(".topTitle");
                        var boxContent = box.find(".content");
                        var boxBottom = box.find(".bottom");
                        boxContent.find(".text div").text(content);
                        if (_mycommon.tools.type.IsUndefined(title)) {
                            topTitle.hide();
                            boxContent.outerHeight(box.outerHeight() - boxBottom.outerHeight());
                        }
                        else {
                            topTitle.text(title);
                            boxContent.outerHeight(box.outerHeight() - topTitle.outerHeight() - boxBottom.outerHeight());
                        }
                        boxContent.find(".text div").css("max-height", boxContent.height());

                        /** 对确认提示框进行定位 */
                        var clientWidth = document.documentElement.clientWidth; //屏幕宽
                        var clientHeight = document.documentElement.clientHeight; //屏幕高 
                        var boxWidth = box.width();
                        var boxHeight = box.height();
                        var cx = (clientWidth - boxWidth) / 2;
                        var cy = (clientHeight - boxHeight) / 2;
                        box.css("left", cx + "px");
                        box.css("top", cy + "px");
                        /** 注册按钮事件 */
                        //注册提示框底部确认按钮事件
                        box.find(".btnSure").click(function () {
                            box.remove();
                            cover.remove();
                            newdef.resolve();
                        });
                        if (type == "prompt") {
                            boxBottom.find(".btnCancel").hide();
                        }
                        else {
                            boxBottom.find(".btnCancel").show();
                            //注册提示框底部取消按钮事件
                            box.find(".btnCancel").click(function () {
                                box.remove();
                                cover.remove();
                                newdef.reject();
                            });
                        }
                    });
                    return newdef;
                }
            },
            /*内部调用方法到这结束*/
            /*
            成功消息提示框
            content:提示内容
            title:提示标题
            */
            alert: function (content, title) {
                this.getMsgBox("alert", content, title);
            },
            /*
            警告消息提示框
            content:提示内容
            title:提示标题
            */
            warn: function (content, title) {
                this.getMsgBox("warn", content, title);
            },
            /*
            错误消息提示框
            content:提示内容
            title:提示标题
            */
            error: function (content, title) {
                this.getMsgBox("error", content, title);
            },
            /*
            确认取消提示框
            content:提示内容
            title:提示标题
            return Deferred延迟对象
            */
            confirm: function (content, title) {
                var def = this.getConfirmBox("confirm", content, title);
                return def;
            },
            /*
            确认提示框(没有取消)
            content:提示内容
            title:提示标题
            return Deferred延迟对象
            */
            prompt: function (content, title) {
                this.getConfirmBox("prompt", content, title);
            }
        },
        //获取url参数
        getUrlParams: function (url) {
            var root = _mycommon;
            if (!url) {
                url = location.href;
            }
            var jsonList = {};
            if (url.indexOf("?") != -1) {
                var str = window.decodeURIComponent(url.slice(url.indexOf("?") + 1));
                var strs = str.split("&");
                for (var i = 0; i < strs.length; i++) {
                    var item = strs[i];
                    try {
                        var r = JSON.parse(item.split("=")[1]);
                        if (root.tools.type.IsNumber(r)) {
                            //数字类型
                            //bug处理：JSON.parse会自动转换匹配的数据类型，比如"0998"会转换为998
                            jsonList[item.split("=")[0]] = item.split("=")[1];
                        } else {
                            jsonList[item.split("=")[0]] = r;
                        }
                    } catch (e) {
                        //字符类型
                        jsonList[item.split("=")[0]] = item.split("=")[1];
                    }
                }
            }
            return jsonList;
        },
        //文件管理
        fileManager: {
            //设置上传控件的配置
            //ps:如果配置冲突，优先数据库配置，然后才是开发配置
            //参数结构
            // {
            //    //是否能上传
            //    canupload: true,
            //    //是否删除
            //    candel: true,
            //    //初始化参数（业务表ID）
            //    fileurlparam: { recordId: batchId },
            //    ocallbacks: {
            //        oOnComplate: function () {
            //            //alert(1);
            //        },
            //        oOnDelete: function () {
            //            //alert(2)
            //        },
            //        oOnUpload: function () {
            //            //alert(3)
            //        },
            //        oOnSessionRequestComplete: function () {
            //            //alert(4)
            //        }
            //    }
            //}
            options: "",
            //初始化表格附件区域
            //busiId        业务id
            //formTypeId    表单类型id
            initTableFiles: function (busiId, formTypeId, fileConfig) {
                _mycommon.ajax({
                    url: "/fileManage/FileUpload/GetFileManagers.do?FormTypeId=" + formTypeId + "&BusinessId=" + busiId,
                    success: function (data) {
                        if (data != null && data.length > 0) {
                            initFileUpload(data, busiId, fileConfig);
                        }
                    }
                });
            },
            /*
            文件下载
            PS：默认是get提交
            入参options:
            {
            url:'',
            data:''
            }
            */
            download: function (options) {

                var root = _mycommon;
                var form;

                var defaultOptions = {
                    url: "",
                    data: '',
                    type: "get"
                };
                $.extend(defaultOptions, options);

                var rawJson = root.tools.jsonToRaw(defaultOptions.data);

                if ($('#_fileform').length > 0) {
                    form = $('#_fileform');
                    form.attr('method', defaultOptions.type);
                    form.attr('action', defaultOptions.url);

                    form.empty();
                    for (var key in rawJson) {
                        if (!rawJson.hasOwnProperty(key)) continue;

                        var input = $("<input type='hidden' name='" + key + "' value='" + rawJson[key] + "'>");
                        form.append(input);
                    }
                } else {
                    form = $('<form id="_fileform" method="' + defaultOptions.type + '" target="hidden_fileframe" action="' + defaultOptions.url + '" ></form>');

                    for (var key in rawJson) {
                        if (!rawJson.hasOwnProperty(key)) continue;

                        var input = $("<input type='hidden' name='" + key + "' value='" + rawJson[key] + "'>");
                        form.append(input);
                    }
                    var iframe = $('<iframe name="hidden_fileframe" id="hidden_fileframe" style="display: none"></iframe>');
                    $($('body')[0]).append(form);
                    $($('body')[0]).append(iframe);
                }
                form.submit();
            }


        },
        //流程管理
        flowManager: {
            context: {},
            params: {},
            url: '/modules/WorkFlow/view/auditDialog.html',
            containerId: '_auditDialog',
            //缓存的延迟对象
            deferred: '',
            miniDialog: '',
            flownotes: '',
            init: function () {
                var root = _mycommon;
                var self = this;
                return root.ajax({ type: 'get', url: self.url, dataType: "html" }).done(function (html) {
                    $('body').append(html);
                    mini.parse();

                });
            },
            addSubmitBeforeEvent: function (fn) {
                _mycommon.eventManager.addEvent("_beidaWorkflowBeforeSubmitEvent", fn);
            },
            addSubmitAfterEvent: function (fn) {
                _mycommon.eventManager.addEvent("_beidaWorkflowAfterSubmitEvent", fn);
            },
            submit: function (data, def) {
                var root = _mycommon;
                var self = this;
                self.deferred = def;
                self.params = data;

                root.ajax({ type: 'get', url: '/workflow/getflowcontext.do', data: data }).done(function (r) {
                    if (r.IsPower == 0) {
                        return _mycommon.tips.warn("已经进入其他业务环节");
                    }
                    self.dataInit(r);
                    self.actionInit();

                });
            },
            dataInit: function (data) {
                var self = this;
                if (!data.CFlowNoteId) {
                    data.CFlowNoteId = data.FlowNoteId;
                }

                $.extend(self.context, data);
                $.extend(self.context, self.params);

                //简化冗余
                if (self.context.AuditsStr) {
                    self.context.AuditsStr = '';
                }
            },
            currentFlowNoteNameInit: function () {
                var self = this;
                $('#_flowNoteName').empty();
                $('#_flowNoteName').text(self.context.FlowNoteName);
            },
            actionInit: function () {
                var self = _mycommon.flowManager;
                //初始化当前节点值
                self.currentFlowNoteNameInit();
                //初始化审批结果集合
                self.auditResultInit();

                //if (self.context.IsQuick == 0) {
                self.miniDialog = mini.get(self.containerId);
                self.miniDialog.show();
                //}
            },
            canceldialog: function () {
                var self = _mycommon.flowManager;
                if (self.miniDialog) {
                    self.miniDialog.hide();
                }
            },
            auditResultInit: function () {
                var self = this;
                var html = '';
                for (var i = 0; i < self.context.Audits.length; i++) {
                    var item = self.context.Audits[i];
                    if (item.IsDefault == 1) {
                        html += '<input name="auditgroup" type="radio" checked="checked" cvalue="' + item.AuditResultFlowNoteId + '" />' + item.CustomAuditText;
                    } else {
                        html += '<input name="auditgroup" type="radio"  cvalue="' + item.AuditResultFlowNoteId + '" />' + item.CustomAuditText;
                    }
                }
                $('#_audits').empty();
                $('#_audits').append(html);

                $('#_savebtn').unbind('click');
                if (self.context.State != '2') {
                    //审核结果change
                    $('input[name="auditgroup"]').click(self.auditResultEvent);
                    $($('input[name="auditgroup"]')[0]).trigger('click');

                    //提交
                    $('#_savebtn').click(self.flowSubmit);
                    //取消
                    $('#_cancelflowbtn').click(self.canceldialog);
                }
            },
            auditResultEvent: function (e) {
                var self = _mycommon.flowManager;
                var v = $(this).attr('cvalue');
                var items = _mycommon.tools.array.where(self.context.Audits, function (item) {
                    return item.AuditResultFlowNoteId == v;
                });
                self.context.AuditValue = items[0].AuditValue;
                self.context.CustomAuditText = items[0].CustomAuditText;
                self.context.AuditResultFlowNoteId = items[0].AuditResultFlowNoteId;

                if (items[0].AutoMatchFlowNoteAndUsers != 2) {
                    //清空 选择步骤和选择人
                    $('#flowNoteContainer').empty();
                    $('#personContainer').empty();

                    _mycommon.ajax({
                        url: "/WorkFlow/GetFlownotes.do",
                        data: self.context,
                        success: self.flowNoteInit
                    });
                }
            },
            flowNoteInit: function (res) {
                var self = _mycommon.flowManager;
                self.flownotes = res;

                //判断是否有默认节点，没有则默认选中第一个
                var hasdefault = false;
                for (var i = 0; i < res.length; i++) {
                    if (res[i].IsDefault == 1) {
                        hasdefault = true;
                        break;
                    }
                }
                if (hasdefault == false) {
                    res[0].IsDefault = 1;
                }

                //初始化html
                for (var i = 0; i < res.length; i++) {
                    var item = res[i];
                    if (item.IsDefault == 1) {
                        $('#flowNoteContainer').append('<input name="flownotegroup" type="radio" checked="checked" cvalue="' + item.FlowNoteId + '"/>' + item.FlowNoteName + '');
                    } else {
                        $('#flowNoteContainer').append('<input name="flownotegroup" type="radio" cvalue="' + item.FlowNoteId + '" />' + item.FlowNoteName + '');
                    }
                }

                $('input[name="flownotegroup"]').click(self.flowNoteSelectEvent);
                $('input[name="flownotegroup"][checked="checked"]').trigger('click');

            },
            flowNoteSelectEvent: function (e) {
                var self = _mycommon.flowManager;
                var v = $(this).attr('cvalue');
                var items = _mycommon.tools.array.where(self.flownotes, function (item) {
                    return item.FlowNoteId == v;
                });
                self.context.FlowNoteJumpId = items[0].FlowNoteJumpId;
                self.context.JumpFlowNoteIds = [items[0].FlowNoteId];

                _mycommon.ajax({
                    url: "/WorkFlow/GetAuditPersons.do",
                    data: self.context,
                    success: self.personInit
                });
            },
            personInit: function (res) {
                var self = _mycommon.flowManager;
                $('#personContainer').empty();
                for (var i = 0; i < res.length; i++) {
                    var item = res[i];
                    $('#personContainer').append('<input name="persongroup" type="checkbox" checked="checked" cvalue="' + item.UserId + '"/>' + item.UserName + '');
                }

                $('input[name="persongroup"]').click(self.personChangeEvent);
                self.personChangeEvent();
            },
            personChangeEvent: function () {
                var self = _mycommon.flowManager;
                var arr = [];
                $('input[name="persongroup"]').each(function () {
                    if (this.checked == true) {
                        arr.push($(this).attr('cvalue'));
                    }
                });

                self.context.AuditUserIds = arr;
            },
            flowSubmit: function () {
                var root = _mycommon;
                var self = _mycommon.flowManager;
                self.context.Remark = $('#remark').val();
                //before
                var def = self.beforeSubmitEvent();

                def.done(function (o) {
                    if (o && o.name) {
                        self.context.Name = o.name;
                    }
                    if (o && o.id && (!self.context.Id || self.context.Id == root.guidempty)) {
                        self.context.Id = o.id;
                    }

                    self.submitStart();

                    var ajaxDef = _mycommon.ajax({
                        url: "/WorkFlow/SubmitFlow.do",
                        data: self.context
                    });

                    var afterAjaxDef = ajaxDef.then(function (flowentity) {
                        root.tips.alert("提交成功");
                        self.submitEnd(true);

                        if (flowentity && flowentity.State == 2) {
                            self.context.isOver = true;
                        }
                        return $.Deferred().resolve(self.context);

                    }).fail(function () {
                        //alert("提交失败");
                        self.submitEnd(false);
                        return $.Deferred().fail(self.context);
                    });

                    self.afterSubmitEvent(afterAjaxDef);

                }).fail(function () {
                    root.tools.console.log("事前回调阻止了工作流提交");
                });

            },
            beforeSubmitEvent: function () {
                var self = _mycommon.flowManager;

                var def = _mycommon.eventManager.triggerEvent("_beidaWorkflowBeforeSubmitEvent", self.context);

                if (!def || !def.done) {
                    def = $.Deferred();
                    def.resolve();
                    return def;
                }

                return def;

            },
            submitStart: function () {
                $('#_dialogMenu').hide();
            },
            submitEnd: function (result) {
                var self = _mycommon.flowManager;
                if (result == true) {
                    self.miniDialog.hide();
                }
                $('#_dialogMenu').show();

                //临时处理，兼容审批容器和列表审批模式
                if ($('#childiframe').length > 0) {
                    this.isNewDocRefresh();
                }
            },
            isNewDocRefresh: function () {
                var self = this;
                var root = _mycommon;
                var params = root.getUrlParams(location.href);
                if (self.context.Id && !params.Id) {
                    var url = location.href;
                    url += "&Id=" + self.context.Id;
                    location.replace(url);
                } else {
                    location.reload();
                }
            },
            afterSubmitEvent: function (def) {
                _mycommon.eventManager.triggerEvent("_beidaWorkflowAfterSubmitEvent", def);
            }
        },
        //工具
        tools: {
            array: {
                where: function (arr, fn) {
                    var newarr = [];
                    var length = arr.length;
                    for (var i = 0; i < length; i++) {
                        var r = fn(arr[i], i);
                        if (!_mycommon.tools.type.IsBoolean(r)) {
                            throw new Error('_mycommon.tools.array.has的fn参数返回值必须是Boolean类型');
                        }
                        if (r === true) {
                            newarr.push(arr[i]);
                        }
                    }
                    return newarr;
                },
                has: function (arr, fn) {
                    var length = arr.length;
                    for (var i = 0; i < length; i++) {
                        var r = fn(arr[i], i);
                        if (!_mycommon.tools.type.IsBoolean(r)) {
                            throw new Error('_mycommon.tools.array.has的fn参数返回值必须是Boolean类型');
                        }
                        if (r === true) {
                            return arr[i];
                        }
                    }
                    return false;
                }
            },
            //控制台
            console: {
                log: function (name) {
                    if (console) {
                        console.log(name);
                    }
                }
            },
            //类型管理
            type: {
                IsString: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object String]';
                },
                IsObject: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Object]';
                },
                IsNumber: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Number]';
                },
                IsArray: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Array]';
                },
                IsUndefined: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Undefined]';
                },
                IsFunction: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Function]';
                },
                IsNull: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Null]';
                },
                IsBoolean: function (obj) {
                    return Object.prototype.toString.call(obj) == '[object Boolean]';
                }
            },
            //比较
            //to do
            compare: {
                equal: function () {

                },
                //以左数据为主，右数据在左数据中的映射有且值发生了改变，返回false
                //PS:新增的字段不算变更;1和"1"不算变更;
                left: function (left, right) {
                    var root = _mycommon;
                    var self = this;

                    if (!left || !right) {
                        throw new Error('_mycommon.tools.compare.left 参数不能为空');
                    }
                    if (root.tools.type.IsArray(left)) {
                        self.leftArr(left, right);
                    } else if (root.tools.type.IsObject(left)) {
                        self.leftObj(left, right);
                    }
                },
                leftObj: function (left, right) {
                    var self = this;

                    for (var key in left) {
                        if (!left.hasOwnProperty(key)) continue;
                        var lItem = left[key];
                        var rItem = right[key];
                        if (root.tools.type.IsArray(item)) {
                            self.leftArr(item, right[rItem]);
                        } else if (root.tools.type.IsObject(item)) {
                            self.leftObj(left, right);
                        }

                    }
                },
                leftArr: function (left, right) {
                    var self = this;
                    for (var i = 0; i < left.length; i++) {
                        self.leftObj(left[i], right[i]);
                    }
                },
                leftValue: function () { }
            },
            url: {
                merge: function (url, params) {
                    var self = this;
                    var root = _mycommon;
                    var rurl = "";//返回的合并url

                    if (root.tools.type.IsObject(params) === false) {
                        throw new Error('[params]参数 暂时只支持对象');
                    }

                    var oldparams = root.getUrlParams(url);

                    var search = "";

                    for (var key in params) {
                        if (!params.hasOwnProperty(key)) continue;

                        var item = params[key];
                        var value = '';
                        if (_mycommon.tools.type.IsObject(item) || _mycommon.tools.type.IsArray(item)) {
                            value = JSON.stringify(item);
                        } else {
                            value = item;
                        }

                        search += "&" + key + "=" + encodeURIComponent(value);

                    }

                    for (var okey in oldparams) {
                        if (!oldparams.hasOwnProperty(okey)) continue;
                        var item = oldparams[okey];

                        var has = false;
                        for (var key in params) {
                            if (okey === key) {
                                has = true;
                                break;
                            }
                        }

                        if (has === false) {
                            var value = '';
                            if (_mycommon.tools.type.IsObject(item) || _mycommon.tools.type.IsArray(item)) {
                                value = JSON.stringify(item);
                            } else {
                                value = item;
                            }

                            search += "&" + okey + "=" + encodeURIComponent(value)
                        }
                    }

                    if (url.indexOf('?') >= 0) {
                        rurl = url.substr(0, url.indexOf('?') + 1) + search.substr(1, search.length - 1);
                    } else {
                        rurl = url + "?" + search.substr(1, search.length - 1);
                    }

                    return rurl;
                }
            },
            jsonToRaw: function (json) {
                var protocol = {};
                var root = _mycommon;
                if (root.tools.type.IsString(json) || root.tools.type.IsBoolean(json) || root.tools.type.IsNumber(json)) {
                    protocol = json;
                }
                else if (root.tools.type.IsArray(json)) {
                    protocol = JSON.stringify(json);
                }
                else {
                    for (var key in json) {
                        if (!json.hasOwnProperty(key)) continue;

                        if (root.tools.type.IsUndefined(json[key]) || root.tools.type.IsFunction(json[key])) {
                            alert(key + ":" + json[key]);
                            //to do log
                            return;
                        }

                        //服务器端默认只解析简单结构的json
                        if (root.tools.type.IsObject(json[key]) || root.tools.type.IsArray(json[key])) {
                            protocol[key] = JSON.stringify(json[key]);
                        } else {
                            protocol[key] = json[key];
                        }
                    }
                }

                return protocol;
            },
            base64: {
                _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                encode: function (input) {
                    var that = this;
                    var output = "";
                    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                    var i = 0;
                    input = that._utf8_encode(input);
                    while (i < input.length) {
                        chr1 = input.charCodeAt(i++);
                        chr2 = input.charCodeAt(i++);
                        chr3 = input.charCodeAt(i++);
                        enc1 = chr1 >> 2;
                        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                        enc4 = chr3 & 63;
                        if (isNaN(chr2)) {
                            enc3 = enc4 = 64;
                        } else if (isNaN(chr3)) {
                            enc4 = 64;
                        }
                        output = output +
                            that._keyStr.charAt(enc1) + that._keyStr.charAt(enc2) +
                            that._keyStr.charAt(enc3) + that._keyStr.charAt(enc4);
                    }
                    return output;
                },
                decode: function (input) {
                    var that = this;
                    var output = "";
                    var chr1, chr2, chr3;
                    var enc1, enc2, enc3, enc4;
                    var i = 0;
                    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
                    while (i < input.length) {
                        enc1 = that._keyStr.indexOf(input.charAt(i++));
                        enc2 = that._keyStr.indexOf(input.charAt(i++));
                        enc3 = that._keyStr.indexOf(input.charAt(i++));
                        enc4 = that._keyStr.indexOf(input.charAt(i++));
                        chr1 = (enc1 << 2) | (enc2 >> 4);
                        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                        chr3 = ((enc3 & 3) << 6) | enc4;
                        output = output + String.fromCharCode(chr1);
                        if (enc3 != 64) {
                            output = output + String.fromCharCode(chr2);
                        }
                        if (enc4 != 64) {
                            output = output + String.fromCharCode(chr3);
                        }
                    }
                    output = that._utf8_decode(output);
                    return output;
                },
                // private method for UTF-8 encoding
                _utf8_encode: function (string) {
                    string = string.replace(/\r\n/g, "\n");
                    var utftext = "";
                    for (var n = 0; n < string.length; n++) {
                        var c = string.charCodeAt(n);
                        if (c < 128) {
                            utftext += String.fromCharCode(c);
                        } else if ((c > 127) && (c < 2048)) {
                            utftext += String.fromCharCode((c >> 6) | 192);
                            utftext += String.fromCharCode((c & 63) | 128);
                        } else {
                            utftext += String.fromCharCode((c >> 12) | 224);
                            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                            utftext += String.fromCharCode((c & 63) | 128);
                        }

                    }
                    return utftext;
                },

                // private method for UTF-8 decoding
                _utf8_decode: function (utftext) {
                    var string = "";
                    var i = 0;
                    var c = c1 = c2 = 0;
                    while (i < utftext.length) {
                        c = utftext.charCodeAt(i);
                        if (c < 128) {
                            string += String.fromCharCode(c);
                            i++;
                        } else if ((c > 191) && (c < 224)) {
                            c2 = utftext.charCodeAt(i + 1);
                            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                            i += 2;
                        } else {
                            c2 = utftext.charCodeAt(i + 1);
                            c3 = utftext.charCodeAt(i + 2);
                            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                            i += 3;
                        }
                    }
                    return string;
                }
            },
            /*
            类似guid
            场景：前端遍历集合时，需要给每一项生成唯一标识
            */
            uuid: function () {
                var s = [];
                var hexDigits = "0123456789abcdef";
                for (var i = 0; i < 36; i++) {
                    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
                }
                s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
                s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
                s[8] = s[13] = s[18] = s[23] = "-";

                var uuid = s.join("");
                return uuid;

            },
            dateFormat: function (dt, fmt) {
                var o = {
                    "M+": dt.getMonth() + 1, //月份
                    "d+": dt.getDate(), //日
                    "h+": dt.getHours(), //小时
                    "m+": dt.getMinutes(), //分
                    "s+": dt.getSeconds(), //秒
                    "q+": Math.floor((dt.getMonth() + 3) / 3), //季度
                    "S": dt.getMilliseconds() //毫秒
                };
                if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (dt.getFullYear() + "").substr(4 - RegExp.$1.length));
                for (var k in o)
                    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                return fmt;
            },
            browser: {
                isIE: function () {
                    var r = false;
                    if (window.navigator.userAgent.indexOf("MSIE") >= 1)
                        r = true;

                    if (!!window.ActiveXObject || "ActiveXObject" in window)
                        r = true;

                    return r;
                }
            }
        },

    };

    window._mycommon = window.com = _mycommon
    //处理iframe加载事件，兼任ie
    window.onload = function () {
        _mycommon.eventManager.triggerEvent('iframeOnloadEvent');
    };
})(window, jQuery);


// 添加 formManager.validate 验证组件
(function ($, formManager) {
    // validate === validate[] === validate[require] 验证非空 ok 
    // validate[int] 验证非负整数 ok
    // validate[num] 验证数字 ok
    // validate[date] 验证日期 
    // validate[max:5] 验证字符串长度最大为5 ok
    // validate[min:5] 验证字符串长度最大为5 ok

    // validate[nmin:5] 验证数字最大5（同时也会验证是否为数字）
    // validate[nmax:5] 验证数字最小5（同时也会验证是否为数字）

    // validate[len:5] 验证字符串长度为5 ok
    // validate[len:0~5] 验证字符串长度为0至5 ok

    // validate[nrange:0~5] 数字范围为 0-5（同时也会验证是否为数字）



    // validate[phone] 验证为手机 ok
    // validate[tel] 验证为电话
    // validate[mail] 验证为邮箱地址

    // validate[numlen:3|len:5] 多项验证（逻辑与）
    var customValidate = []

    function transformValidateStr(str) {
        if (str === 'require') {
            return function (str) { return str ? true : "此项为必填字段" }
        }
        if (str === 'num') {
            return function (str) { return /^(\d|\-\d)\d*\.?\d*$/.test(str) ? true : str === '' ? true : "此项需要填写数字" }
        }
        if (str === 'int') {
            return function (str) { return /^[0-9]*$/.test(str) ? true : "此项需要填写非负整数" }
        }
        if (str === 'phone') {
            return function (str) { return /^1[34578]\d{9}$/.test(str) || /^01[34578]\d{9}$/.test(str) ? true : '请输入正确的手机号码' }
        }

        if (str === 'date') {
            return function (str) {
                return (
                    /^20\d\d-[01]?\d-[0123]?\d?/.test(str) ||
                    /^20\d\d\/[01]?\d\/[0123]?\d?/.test(str) ||
                    /^20\d\d年[01]?\d月[0123]?\d?日/.test(str) ||
                    str === ''
                )
            }
        }
        if (str.indexOf('max:') === 0) {
            var n = parseInt(str.replace('max:', ''))
            return function (str) { return str === '' || str.length <= n ? true : '此字段最大长度为' + n }
        }

        if (str.indexOf('min:') === 0) {
            var n = parseInt(str.replace('min:', ''))
            return function (str) { return str === '' || str.length >= n ? true : '此字段最小长度为' + n }
        }

        if (str.indexOf('len:') === 0) {
            var n = str.replace('len:', '').split('~').map(function (v) { return parseInt(v) })

            return (
                n.length < 2
                    ? function (str) {
                        return str === '' || str.length == n[0] ? true : '此字段需要长度为' + n[0]
                    }
                    : function (str) {
                        return (str === '') || (str.length >= n[0] && str.length <= n[1]) ? true : '此字段长度在' + n[0] + '和' + n[1] + '之间'
                    }
            )

        }
    }

    function colorInput(dom, msg, type) {

        var msgDom = document.getElementById('validate_msg_info') ? document.getElementById('validate_msg_info') : document.createElement('div')

        msgDom.id = 'validate_msg_info'
        msgDom.innerHTML = msg


        msgDom.style.position = 'fixed'
        msgDom.style.fontSize = '14px'
        msgDom.style.color = "#666"
        msgDom.style.background = '#fff'
        msgDom.style.padding = "6px 16px"
        msgDom.style.border = "solid 1px #ccc"
        msgDom.style.borderRadius = '4px'
        msgDom.style.zIndex = '999'


        scrollToShow(dom, function () {
            document.getElementsByTagName('body')[0].appendChild(msgDom)
            msgDom.style.display = 'block'


            var p0 = dom.getBoundingClientRect()
            var p = {
                left: p0.left,
                right: $(window).width() - p0.right,
                top: p0.top,
                bottom: $(window).height() - p0.bottom

            }
            console.log(p)

            if (p.top > msgDom.offsetHeight) {
                msgDom.style.top = p.top - msgDom.offsetHeight - 4 + 'px'
            } else {
                msgDom.style.bottom = p.bottom - msgDom.offsetHeight + 'px'
            }

            if (p.right < p.left) {
                msgDom.style.right = p.right + 'px'
                msgDom.style.left = ''
            } else {
                msgDom.style.left = p.left + 'px'
                msgDom.style.right = ''
            }


        })



        if (type === 'raw') {
            dom.style.borderColor = '#FF4949'
        } else if (type === 'mini') {
            $(dom).find('.mini-buttonedit-border').get(0).style.borderColor = '#FF4949'
        } else if (type === 'mini-datagrid') {
            $(dom).find('.mini-grid-border').get(0).style.borderColor = '#FF4949'
        }



        function cancel() {
            msgDom.style.display = 'none'

            if (type === 'raw') {
                dom.style.borderColor = ''
            } else if (type === 'mini') {
                $(dom).find('.mini-buttonedit-border').get(0).style.borderColor = ''
            } else if (type === 'mini-datagrid') {
                $(dom).find('.mini-grid-border').get(0).style.borderColor = ''
            }

            $('body').off('mousedown', cancel)
            $('body').off('mousewheel', cancel)
        }
        $('body').on('mousedown', cancel)
        $('body').on('mousewheel', cancel)
    }

    function Input(dom, validate_arr) {
        return {
            dom: dom,
            id: dom.id,
            type: dom.className.indexOf('mini-datagrid') >= 0 ? "mini-datagrid" : dom.className.indexOf('mini-') >= 0 ? 'mini' : 'raw',
            validate: validate_arr.map(function (e) {
                return typeof e === 'string' ? transformValidateStr(e) : e
            })
        }
    }

    function validate(filter) {
        var fil = filter ? filter : function () { return true }

        // 生成验证 input 实例
        var inputs = $('[class *= "validate["],.validate').get()
            .map(function (e) {
                return {
                    dom: e,
                    classArray: e.className.split(' ')
                }
            })
            .map(function (e) {
                var str = e.classArray.find(function (v) { return v.indexOf('validate') >= 0 })
                return {
                    dom: e.dom,
                    validate: str === 'validate' ? [] : str.match(/\[([A-Za-z0-9_:|]*)\]/)[1].split('|')
                }
            })
            .map(function (e) {
                return Input(e.dom, e.validate.length === 0 ? ['require'] : e.validate)
            })
            .concat(customValidate.map(function (v) {
                return Input(document.getElementById(v.id), v.check instanceof Array ? v.check : [v.check])
            }))
            .reduce(function (r, c) {
                var t = r.find(function (a) { return a.dom === c.dom })
                if (t) { t.validate = t.validate.concat(c.validate) }
                else r.push(c)
                return r
            }, [])

        // 进行验证
        var info = inputs
            .filter(fil)
            .map(function (i) {
                return i.validate.map(function (v) {
                    return {
                        id: i.id,
                        dom: i.dom,
                        type: i.type,
                        check: v,
                        msg: ''
                    }
                })
            })
            .flat()
            .find(function (e) {
                e.msg = e.check(
                    // 根据type取值
                    e.type === 'mini-datagrid'
                        ? mini.get(e.dom).getData()
                        : (e.type === 'mini' ? mini.get(e.dom).getValue() : e.dom.value).replace(/(^\s*)|(\s*$)/g, ""),
                    e.dom
                )
                return typeof e.msg === 'string'
            })


        if (info) {
            colorInput(info.dom, info.msg, info.type)
            return info
        } else {
            return undefined
        }
    }

    function scroll(d, s, callback) {
        var top = d.scrollTop
        if ((top - s) < 4 && (top - s) > -4) return callback()


        // 判断 s 是否在滚动范围内
        var min = 0
        var max = d.scrollHeight - d.offsetHeight
        if (min >= max) return callback()

        if (s < min) s = min
        if (s > max) s = max


        d.scrollTop = (top + s) / 2

        setTimeout(function () {
            scroll(d, s, callback)
        }, 30);
    }

    function scrollToShow(dom, callback) {
        var target = dom
        var dom = target
        var pa = null
        var height = 0
        while (dom) {
            if (dom.scrollHeight > dom.offsetHeight) {
                pa = dom
                break
            } else {
                height += dom.offsetTop
            }
            dom = dom.offsetParent
        }

        var h = pa.offsetHeight * 0.4

        var s = height - h

        scroll(pa, s, callback)
    }


    formManager.validate = function (arr) {
        if (!arr) validate()
        else {
            validate(function (a) {
                return arr.some(function (b) { return b.id === a.id })
            })
        }
    }
    formManager.noValidate = function (arr) {
        validate(function (a) {
            return arr.some(function (b) { return b !== a.id })
        })
    }
    formManager.addValidate = function (arr) {
        customValidate = customValidate.concat(arr.map(function (v) { return { id: v.id, check: v.check } }))
    }

})(jQuery, window._mycommon.formManager)
