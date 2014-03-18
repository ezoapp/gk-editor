define(['./simplehtmlparser'], function () {
  var voidMap = (function () {
    var voidEle = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"],
      map = {};
    for (var i = 0, j = voidEle.length; i < j; i++) {
      map[voidEle[i]] = true;
    }
    return map;
  }()),
    parser = new SimpleHtmlParser(),
    lc,
    buffer,
    map,
    context,
    currCtx;

  function reset() {
    lc = 0;
    buffer = '';
    map = {
      ROOT: newContext()
    };
    context = [];
    currCtx = 'ROOT';
  }

  function newContext() {
    return {
      from: {},
      to: {},
      children: []
    }
  }

  function pushContext(ctx) {
    map[ctx] = map[ctx] || newContext();
    context.push(ctx);
    currCtx = ctx;
  }

  function popContext() {
    var ctx = context.pop();
    currCtx = context[context.length - 1];
    return ctx;
  }

  function getContextName(line, ch) {
    return line + ':' + ch;
  }

  function processLines(lines) {
    var end = lines.length - 1;
    buffer += lines[0];
    if (end > 0) {
      lc += end;
      buffer = lines[end];
    }
  }

  function parseStartTag(content) {
    var name = getContextName(lc, buffer.length);
    map[name] = newContext();
    map[name].from = {
      line: lc,
      ch: buffer.length
    };
    processLines(content.split('\n'));
    map[name].to = {
      line: lc,
      ch: buffer.length
    };
    if (map[currCtx]) {
      map[currCtx].children.push(name);
    }
    return name;
  }

  function parseEndTag(content) {
    processLines(content.split('\n'));
    map[currCtx] && (map[currCtx].to = {
      line: lc,
      ch: buffer.length
    });
  }

  function parseCharacters(chars) {
    processLines(chars.split('\n'));
  }

  function getElementPath(ele) {
    var path = [],
      parent = ele.parentElement;
    if (parent) {
      path = getElementPath(parent);
      for (var i = 0, j = parent.children.length; i < j; i++) {
        if (parent.children[i] === ele) {
          break;
        }
      }
      path.push(i);
    }
    return path;
  }

  return {
    parse: function (code) {
      reset();
      parser.parse(code, {
        startElement: function (tag, content, attrs) {
          var name = parseStartTag(content);
          if (!(tag.toLowerCase() in voidMap)) {
            pushContext(name);
          }
        },
        endElement: function (tag, content) {
          parseEndTag(content);
          popContext();
        },
        characters: function (chars) {
          parseCharacters(chars);
        },
        comment: function (comment) {
          parseCharacters('<!--' + comment + '-->');
        }
      });
      return map;
    },
    traverseNode: function (map, ele) {
      if (!(map && ele)) {
        return;
      }
      var node = map['ROOT'],
        path = getElementPath(ele);
      for (var i = 0, j = path.length; node && i < j; i++) {
        node = map[node.children[path[i]]];
      }
      return node;
    }
  };
});