var prettyData,mapLoad;
if(!window.Editor)
    window.Editor = {};

$(document).ready(function() {

    mapLoad = function(data) {
        return function(n) {                    
            if(n in data)
                this[n](data[n]);
        };
    };

    function indent(s,n)
    {
        //if n is not given, set n=1
        if(n===undefined)
            n=1;

        var lines = s.split('\n');
        for(var tabs='';tabs.length<n;tabs+='  '){}

        for(var i=0;i<lines.length;i++)
        {
            lines[i] = tabs+lines[i];
        }
        return lines.join('\n');
    }

    //represent a JSON-esque object in the Numbas .exam format
    prettyData = function(data){
        switch(typeof(data))
        {
        case 'number':
            return data+'';
        case 'string':
            //this tries to use as little extra syntax as possible. Quotes or triple-quotes are only used if necessary.
            if(data.contains('"'))
                return '"""'+data+'"""';
            if(data.search(/[\n,\{\}\[\] ]/)>=0)
                return '"'+data+'"';
            else if(!data.trim())
                return '""';
            else
                return data;
        case 'boolean':
            return data ? 'true' : 'false';
        case 'object':
            if($.isArray(data))    //data is an array
            {
                if(!data.length)
                    return '[]';    //empty array

                data = data.map(prettyData);    //pretty-print each of the elements

                //decide if the array can be rendered on a single line
                //if any element contains a linebreak, render array over several lines
                var multiline=false;
                for(var i=0;i<data.length;i++)
                {
                    if(data[i].contains('\n'))
                        multiline = true;
                }
                if(multiline)
                {
                    data=data.map(function(s){return indent(s)});
                    return '[\n'+data.join('\n')+'\n]';
                }
                else
                {
                    return '[ '+data.join(', ')+' ]';
                }
            }
            else    //data is an object
            {
                if(!Object.keys(data).filter(function(x){return x}).length)
                    return '{}';
                var o='{\n';
                for(var x in data)
                {
                    if(x)
                        o += indent(x+': '+prettyData(data[x]))+'\n';
                }
                o+='}';
                return o;
            }
        }
    };

    Editor.Ruleset = function(exam,data)
    {
        this.name = ko.observable('ruleset'+exam.rulesets().length);
        this.sets = ko.observableArray([]);
        this.allsets = exam.allsets;
        this.remove = function() {
            if(confirm("Remove this ruleset?"))
                exam.rulesets.remove(this);
        };
        if(data)
            this.load(data);
    }
    Editor.Ruleset.prototype = {
        load: function(data) {
            var ruleset = this;
            this.name(data.name);
            data.sets.map(function(set){ ruleset.sets.push(set); });
        }
    };

    Editor.Variable = function(q,data) {
        this.name = ko.observable('');
        this.definition = ko.observable('');
        this.remove = function() {
            q.variables.remove(this);
        };
        if(data)
            this.load(data);
    }
    Editor.Variable.prototype = {
        load: function(data) {
            this.name(data.name);
            this.definition(data.definition);
        }
    }


    //make folders work
    $('.fold > #folder-header').live('click',function() {
        $(this).siblings('#folder').toggle(150,function() {
            var p = $(this).parent();
            p.hasClass('folded') ? p.removeClass('folded') : p.addClass('folded');
        });
    });

    ko.bindingHandlers.writemaths = {
        init: function(element,valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor()) || '';
            var d = $('<div/>');
            $(element).append(d);
            var wm = new WriteMaths(d);
            wm.setState(value);
            $(element).bind('input',function() {
                valueAccessor()(d.attr('value'));
            });
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).trigger('setstate',value);
        }
    };
    
    ko.bindingHandlers.foldlist = {
        init: function(element,valueAccessor,allBindingsAccessor,viewModel)
        {
            var value = valueAccessor(), allBindings = allBindingsAccessor();
            var show = allBindings.show;

            element=$(element);
            var f=$('<div class="fold"><div id="folder-header"></div><div id="folder"></div></div>');
            f.find('#folder-header').html(ko.utils.unwrapObservable(allBindings.label));
            if(show)
                f.find('#folder').css('display','block');
            element.contents().appendTo(f.find('#folder'));
            var b = $('<button class="remove" data-bind="click:remove"></button>');
            b.click(function(){viewModel.remove()});
            element.append(b);
            element.append(f);
        },
        update: function(element,valueAccessor,allBindingsAccessor)
        {
            var value = valueAccessor(), allBindings = allBindingsAccessor();
            $(element).find('>.fold>#folder-header').html(ko.utils.unwrapObservable(allBindings.label));
        }
    };

    ko.bindingHandlers.fadeVisible = {
        init: function (element, valueAccessor) {
            // Initially set the element to be instantly visible/hidden depending on the value
            var value = valueAccessor();
            $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
        },
        update: function (element, valueAccessor) {
            // Whenever the value subsequently changes, slowly fade the element in or out
            var value = valueAccessor();
            ko.utils.unwrapObservable(value) ? $(element).slideDown(150) : $(element).slideUp(150);
        }
    };

    ko.bindingHandlers.listbox = {
        init: function(element,valueAccessor) {
            var value = valueAccessor();
            $(element).addClass('listbox');

            var i = $('<input/>');
            i.keydown(function(e){
                switch(e.which)
                {
                case 13:
                case 9:
                    var val = $(this).val().slice(0,this.selectionStart);
                    if(val.length)
                        value.push(val);
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).val($(this).val().slice(val.length));
                    break;
                case 8:
                    if(this.selectionStart==0 && this.selectionEnd==0)
                    {
                        var oval = $(this).val();
                        var val = (value.pop() || '').slice(0,-1);
                        $(this).val(val+oval);
                        this.setSelectionRange(val.length,val.length);
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    break;
                }
            });
            i.blur(function(e){
                var val = $(this).val();
                if(val.length)
                    value.push(val);
                $(this).val('');
            });
            $(element).append('<ul/>');
            $(element).append(i);
            $(element).delegate('li','click',function(){
                var n = $(this).index();
                i.val(value()[n]).focus();
                value.splice(n,1);
            });
        },
        update: function(element,valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).find('ul li').remove();
            for(var i=0;i<value.length;i++)
            {
                $(element).find('ul').append($('<li/>').html(value[i]));
            }
        }
    }

});