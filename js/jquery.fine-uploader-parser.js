
(function () {
    var callbacks = ["onSubmit", "onSubmitted", "onComplete", "onAllComplete", "onCancel", "onUpload", "onUploadChunk",
        "onUploadChunkSuccess", "onResume", "onProgress", "onTotalProgress", "onError", "onAutoRetry", "onManualRetry",
        "onValidateBatch", "onValidate", "onSubmitDelete", "onDelete", "onDeleteComplete", "onPasteReceived",
        "onStatusChange", "onSessionRequestComplete"];
    
    var temp = '<div class="qq-uploader-selector clearfix">' +
                    '<a id ="_fineuploadbutton" style="display:block;text-decoration:none;"  href="#" class="qq-upload-button-selector btn btn-link btn-sm pull-left">' +
                        '<img src="/image/fileUpload.png" style:"height:14px;" style="position:relative;top:4px;"/><span  class="icons-fileupload" style="font-size: 14px!important;line-height:24px;position: relative;top: -4px;">添加附件</span>&nbsp; ' +
                    '</a>' +
                    '<div class="qq-total-progress-bar-container-selector progress pull-left">' +
                        '<div class="qq-total-progress-bar-selector progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>' +
                    '</div>' +
                    '<ul class="qq-upload-list-selector pull-left" aria-live="polite">' +
                        '<li>' +
                            '<a href="#" class="btn btn-link btn-sm">' +
                                '<span class="qq-upload-file-selector" style="font-size: 14px;color:#2F4F4F;"></span>' +
                            '</a>' +
                            '<div class="btn-group btn-group-sm" style="margin-left:10px;display:inline">'+
    '<span class="qq-upload-cancel-selector btn btn-link" style="font-size: 11px;padding: 5px 2px; display:none" title="取消上传"><a href="#" style="text-decoration:none;color: #808080;">取消上传</a></span>';
                                //'<span class="qq-upload-retry-selector btn btn-link" style="padding: 5px 2px;display:none" title="重新上传"><a href="#">重新上传</a></span>' +
                //                '<span  class="qq-upload-delete-selector btn btn-link" style="padding: 5px 2px;display:none" title="删除"><a href="#">删除</a></span>' +
                //            '</div>' +
                //        '</li>' +
                //    '</ul>' +
                //'</div>';
    var temp_del = '<span  class="qq-upload-delete-selector btn btn-link" style="font-size: 11px;padding: 5px 2px;" title="删除"><a href = "#" style="text-decoration:none;color: #808080;">删除</a></span>';
    var temp_part = '</div>' +
                        '</li>' +
                    '</ul>' +
                '</div>';
    function parser(element) {
        var result = {};
        for (var i = 0; i < callbacks.length; i++) {
            var key = callbacks[i], attr = jQuery(element).attr(key);
            if (attr && window[attr] && jQuery.isFunction(window[attr])) {
                result[key] = window[attr];
            }
        }
        return result;
    }
    fineUploaderInit = function (oconfig) {
        var config = {
            //控件唯一标识
            id: "",
            //选择容器
            uploadcontainerid: "",
            //附件容器
            filecontainerid: "",
            //是否支持多选
            multiple: true,
            //类型和大小限制
            validation: {
                allowedExtensions: ['jpeg', 'jpg', 'txt', 'rar', 'zip', '7z', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx', 'pdf', 'amr', 'mp4', 'mp3', 'wav'],
                sizeLimit: 51200000,// 50 kB = 50 * 1024 bytes
                itemLimit: 99
            },
            //是否能上传
            canupload: true,
            //上传路径
            uploadurl: '',
            //是否删除
            candel: true,
            //是否初始化列表
            hasinit: true,
            //初始化参数
            //fileurlparam: { recordId: "973EA29D-37E1-45AB-A396-E989D3495FC1" },
            //模板
            temp: temp,
            //事件回调
            callbacks: {
                //每个文件上传完成时
                onComplete: function (id, name, responseJSON, xhr) {
                    if (responseJSON.success == false) {
                        alert(responseJSON.message);
                    } 
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    var filename = name.split(".")[0];
                    var filetype = name.split(".")[1];
                    jQuery('li[qq-file-id=' + id + '] a:first').attr('href', "/fileManage/FileUpload/FileDownLoad.do?fileId=" + nid);
                    jQuery('li[qq-file-id=' + id + '] span')[1].style.display = 'none';
                    if (jQuery('li[qq-file-id=' + id + '] span').length == 3) {
                        jQuery('li[qq-file-id=' + id + '] span')[2].style.display = 'inline';
                    }
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnComplate) {
                        oconfig.ocallbacks.oOnComplate(id, name);
                    }
                },
                //删除前
                onDelete: function (id) {
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnDelete) {
                        oconfig.ocallbacks.oOnDelete(id);
                    }
                },
                //上传前触发
                onUpload: function (id, name) {
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    jQuery('li[qq-file-id=' + id + '] span')[1].style.display = 'inline';
                    if (jQuery('li[qq-file-id=' + id + '] span').length == 3) {
                        jQuery('li[qq-file-id=' + id + '] span')[2].style.display = 'none';
                    }
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnUpload) {
                        oconfig.ocallbacks.oOnUpload(id, name);
                    }
                },
                //初始化完成时为每个节点设置下载路径
                onSessionRequestComplete: function (arr, success, xhr) {
                    var that = this;
                    var arr1 = [];
                    var lilist = jQuery('li[qq-file-id]', fcontainer);
                    if (lilist && lilist.length > 0) {
                        for (var i = lilist.length - 1 - arr.length; i >= 0; i--) {
                            jQuery(lilist[i]).remove();
                        }
                    }
                    
                    jQuery('li[qq-file-id]', fcontainer).each(function (arr, obj) {
                        var id = jQuery(this).attr('qq-file-id');
                        var nid = that._uploadData.retrieve({ id: id }).uuid;
                        var name = that._uploadData.retrieve({ id: id }).name;
                        var filename = name.split(".")[0];
                        var filetype = name.split(".")[1];
                        if (!(Object.prototype.toString.call(nid) === "[object String]"))
                            nid = arr1[id].uuid;

                        jQuery('a:first', this).attr('href', "/fileManage/FileUpload/FileDownLoad.do?fileId=" + nid);

                    });
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnSessionRequestComplete) {
                        oconfig.ocallbacks.oOnSessionRequestComplete(arr, lilist);
                    }
                }
            }
        };
        jQuery.extend(config, oconfig);

        //upload container
        var container = jQuery('#' + config.uploadcontainerid);
        var fcontainer = jQuery('#' + config.filecontainerid);
        //validate
        if (!config.id) {
            return alert("config.id不能为空，作为唯一标识");
        }

        if (container.length <= 0) {
            alert("上传控件初始化需要指定有效的config.uploadcontainerid属性值");
            return;
        }

        if (fcontainer.length > 0) {
            container.attr('data-container', config.filecontainerid);
        } else {
            fcontainer = jQuery('#' + container.attr('data-container'));
            if (fcontainer.length <= 0) {
                return alert("上传控件初始化需要指定有效的config.filecontainerid属性值");
            }
        }

        //添加默认样式
        

        if (!container.hasClass('upload-container')) {
            container.addClass('upload-container');
        }
  
        if (!fcontainer.hasClass('upload-filelist-container')) {
            fcontainer.addClass('upload-filelist-container');
            fcontainer.css('float', 'left');
            fcontainer.css("min-height", "24px");
        }

        if (config.canupload == false) {
            config.temp = config.temp.replace('block', 'none');
        }

        if (config.candel == false) {
            config.temp = config.temp + temp_part;
        } else {
            config.temp = config.temp + temp_del + temp_part;
        }
        var saveUrl = container.attr("data-upload-url"),
                initUrl = container.attr("data-upload-init-url"),
                deleteUrl = container.attr("data-upload-delete-url");

        var fu = container.fineUploader({
            listElement: fcontainer,
            template: jQuery("<div>" + config.temp + "</div>"),
            callbacks: config.callbacks,
            classes: {
                hide: "hide"
            },
            request: {
                endpoint: '/fileManage/FileUpload/FileUpload.do',
                params: config.fileurlparam,
            },
            multiple: config.multiple,
            validation: config.validation,
            deleteFile: {
                //customHeaders: {"Content-Type": 'application/json'},
                enabled: config.candel,
                method: 'POST',
                endpoint: '/fileManage/FileUpload/DeleteFile.do',
                forceConfirm: true,
                confirmMessage: '确定要删除文件 {filename} 吗？ 不可恢复！！',
                deletingFailedText: '删除失败！'
                //  params: { "param": JSON.stringify(defaultConfig.protocol.param) }
            },
            session: {
                //customHeaders: {"Content-Type": 'application/json'},
                enabled: config.hasinit,
                endpoint: "/fileManage/FileUpload/GetReturnFilesInfo.do",
                params: config.fileurlparam,
                refreshOnReset: true
            },
            text: {
                defaultResponseError: "上传失败原因未知",
                failUpload: "上传失败",
                waitingForResponse: "上传中...",
                paused: "暂停"
            },
            messages: {
                typeError: "控件限制了上传附件的类型",
                sizeError: "文件过大",
                minSizeError: "文件过小",
                emptyError: "空文件，请重新选择",
                noFilesError: "没有文件上传",
                tooManyItemsError: "上传文件数量超过限制",
                maxHeightImageError: "图片太高",
                maxWidthImageError: "图片太宽",
                minHeightImageError: "图片高度不够",
                minWidthImageError: "图片宽度不够",
                retryFailTooManyItems: "重新上传失败，上传数量超过限制",
                onLeave: "文件正在上传，如果离开将取消上传文件",
                unsupportedBrowserIos8Safari: "不支持IOS8"
            },
            showMessage: function (message) {

                return window.alert(message);
            },

            showConfirm: function (message) {
                return window.confirm(message, function (r) { return r; });

            },

            showPrompt: function (message, defaultValue) {
                return window.prompt('Prompt', 'Please enter your name:', function (r) { return r; });
            }
        });

        return fu;
    }
    fineAllUploaderInit = function (oconfig) {
        var config = {
            //控件唯一标识
            id: "",
            //选择容器
            uploadcontainerid: "",
            //附件容器
            filecontainerid: "",
            //是否支持多选
            multiple: true,
            //类型和大小限制
            validation: {
                allowedExtensions: ['jpeg', 'jpg', 'txt', 'rar', 'zip', '7z', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx', 'pdf', 'amr', 'mp4', 'mp3', 'wav'],
                sizeLimit: 51200000,// 50 kB = 50 * 1024 bytes
                itemLimit: 99
            },
            //是否能上传
            canupload: true,
            //上传路径
            uploadurl: '',
            //是否删除
            candel: true,
            //是否初始化列表
            hasinit: true,
            //初始化参数
            //fileurlparam: { recordId: "973EA29D-37E1-45AB-A396-E989D3495FC1" },
            //模板
            temp: temp,
            //事件回调
            callbacks: {
                //每个文件上传完成时
                onComplete: function (id, name, responseJSON, xhr) {
                    if (responseJSON.success == false) {
                        alert(responseJSON.message);
                    }
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    var filename = name.split(".")[0];
                    var filetype = name.split(".")[1];
                    jQuery('li[qq-file-id=' + id + '] a:first').attr('href', "/fileManage/FileUpload/FileDownLoad.do?fileId=" + nid);
                    jQuery('li[qq-file-id=' + id + '] span')[1].style.display = 'none';
                    if (jQuery('li[qq-file-id=' + id + '] span').length == 3) {
                        jQuery('li[qq-file-id=' + id + '] span')[2].style.display = 'inline';
                    }
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnComplate) {
                        oconfig.ocallbacks.oOnComplate(id, name);
                    }
                },
                //删除前
                onDelete: function (id) {
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnDelete) {
                        oconfig.ocallbacks.oOnDelete(id);
                    }
                },
                //上传前触发
                onUpload: function (id, name) {
                    var nid = this._uploadData.retrieve({ id: id }).uuid;
                    var name = this._uploadData.retrieve({ id: id }).name;
                    jQuery('li[qq-file-id=' + id + '] span')[1].style.display = 'inline';
                    if (jQuery('li[qq-file-id=' + id + '] span').length == 3) {
                        jQuery('li[qq-file-id=' + id + '] span')[2].style.display = 'none';
                    }
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnUpload) {
                        oconfig.ocallbacks.oOnUpload(id, name);
                    }
                },
                //初始化完成时为每个节点设置下载路径
                onSessionRequestComplete: function (arr, success, xhr) {
                    var that = this;
                    var arr1 = [];
                    var lilist = jQuery('li[qq-file-id]', fcontainer);
                    if (lilist && lilist.length > 0) {
                        for (var i = lilist.length - 1 - arr.length; i >= 0; i--) {
                            jQuery(lilist[i]).remove();
                        }
                    }

                    jQuery('li[qq-file-id]', fcontainer).each(function (arr, obj) {
                        var id = jQuery(this).attr('qq-file-id');
                        var nid = that._uploadData.retrieve({ id: id }).uuid;
                        var name = that._uploadData.retrieve({ id: id }).name;
                        var filename = name.split(".")[0];
                        var filetype = name.split(".")[1];
                        if (!(Object.prototype.toString.call(nid) === "[object String]"))
                            nid = arr1[id].uuid;

                        jQuery('a:first', this).attr('href', "/fileManage/FileUpload/FileDownLoad.do?fileId=" + nid);

                    });
                    if (oconfig.ocallbacks && oconfig.ocallbacks.oOnSessionRequestComplete) {
                        oconfig.ocallbacks.oOnSessionRequestComplete(arr, lilist);
                    }
                }
            }
        };
        jQuery.extend(config, oconfig);

        //upload container
        var container = jQuery('#' + config.uploadcontainerid);
        var fcontainer = jQuery('#' + config.filecontainerid);
        //validate
        if (!config.id) {
            return alert("config.id不能为空，作为唯一标识");
        }

        if (container.length <= 0) {
            alert("上传控件初始化需要指定有效的config.uploadcontainerid属性值");
            return;
        }

        if (fcontainer.length > 0) {
            container.attr('data-container', config.filecontainerid);
        } else {
            fcontainer = jQuery('#' + container.attr('data-container'));
            if (fcontainer.length <= 0) {
                return alert("上传控件初始化需要指定有效的config.filecontainerid属性值");
            }
        }

        //添加默认样式


        if (!container.hasClass('upload-container')) {
            container.addClass('upload-container');
        }

        if (!fcontainer.hasClass('upload-filelist-container')) {
            fcontainer.addClass('upload-filelist-container');
            fcontainer.css('float', 'left');
            fcontainer.css("min-height", "24px");
        }

        if (config.canupload == false) {
            config.temp = config.temp.replace('block', 'none');
        }

        if (config.candel == false) {
            config.temp = config.temp + temp_part;
        } else {
            config.temp = config.temp + temp_del + temp_part;
        }
        var saveUrl = container.attr("data-upload-url"),
                initUrl = container.attr("data-upload-init-url"),
                deleteUrl = container.attr("data-upload-delete-url");

        var fu = container.fineUploader({
            listElement: fcontainer,
            template: jQuery("<div>" + config.temp + "</div>"),
            callbacks: config.callbacks,
            classes: {
                hide: "hide"
            },
            request: {
                endpoint: '/fileManage/FileUpload/FileUpload.do',
                params: config.fileurlparam,
            },
            multiple: config.multiple,
            validation: config.validation,
            deleteFile: {
                //customHeaders: {"Content-Type": 'application/json'},
                enabled: config.candel,
                method: 'POST',
                endpoint: '/fileManage/FileUpload/DeleteFile.do',
                forceConfirm: true,
                confirmMessage: '确定要删除文件 {filename} 吗？ 不可恢复！！',
                deletingFailedText: '删除失败！'
                //  params: { "param": JSON.stringify(defaultConfig.protocol.param) }
            },
            session: {
                //customHeaders: {"Content-Type": 'application/json'},
                enabled: config.hasinit,
                endpoint: "/fileManage/FileUpload/GetAllFiles.do",
                params: config.fileurlparam,
                refreshOnReset: true
            },
            text: {
                defaultResponseError: "上传失败原因未知",
                failUpload: "上传失败",
                waitingForResponse: "上传中...",
                paused: "暂停"
            },
            messages: {
                typeError: "控件限制了上传附件的类型",
                sizeError: "文件过大",
                minSizeError: "文件过小",
                emptyError: "空文件，请重新选择",
                noFilesError: "没有文件上传",
                tooManyItemsError: "上传文件数量超过限制",
                maxHeightImageError: "图片太高",
                maxWidthImageError: "图片太宽",
                minHeightImageError: "图片高度不够",
                minWidthImageError: "图片宽度不够",
                retryFailTooManyItems: "重新上传失败，上传数量超过限制",
                onLeave: "文件正在上传，如果离开将取消上传文件",
                unsupportedBrowserIos8Safari: "不支持IOS8"
            },
            showMessage: function (message) {

                return window.alert(message);
            },

            showConfirm: function (message) {
                return window.confirm(message, function (r) { return r; });

            },

            showPrompt: function (message, defaultValue) {
                return window.prompt('Prompt', 'Please enter your name:', function (r) { return r; });
            }
        });

        return fu;
    }
})();