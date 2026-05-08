/* 本地搜索功能 */
$(document).ready(function() {
  const searchInput = $('#local-search-input');
  const searchResult = $('#local-search-result');
  let searchIndex = [];

  // 从 API 获取所有已发布的文章
  function loadSearchIndex() {
    $.ajax({
      url: 'http://localhost:3002/api/posts/all',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        searchIndex = data.posts || [];
        console.log('搜索索引已加载，共 ' + searchIndex.length + ' 篇文章');
      },
      error: function() {
        console.error('加载搜索索引失败');
        searchIndex = [];
      }
    });
  }

  // 执行搜索
  function performSearch(query) {
    if (!query || query.trim().length === 0) {
      searchResult.html('<div style="padding: 20px; text-align: center; color: #999;">请输入搜索关键词</div>');
      return;
    }

    const keywords = query.toLowerCase().trim().split(/\s+/);
    const results = [];

    // 搜索文章标题、摘要、标签
    searchIndex.forEach(function(post) {
      let score = 0;
      const title = (post.title || '').toLowerCase();
      const excerpt = (post.excerpt || '').toLowerCase();
      const tags = (post.tags || []).map(t => t.toLowerCase());

      // 标题匹配（权重最高）
      keywords.forEach(function(keyword) {
        if (title.includes(keyword)) {
          score += 10;
        }
        // 标签匹配（权重中等）
        tags.forEach(function(tag) {
          if (tag.includes(keyword)) {
            score += 5;
          }
        });
        // 摘要匹配（权重较低）
        if (excerpt.includes(keyword)) {
          score += 1;
        }
      });

      if (score > 0) {
        results.push({
          post: post,
          score: score
        });
      }
    });

    // 按分数排序
    results.sort(function(a, b) {
      return b.score - a.score;
    });

    displayResults(results, query);
  }

  // 显示搜索结果
  function displayResults(results, query) {
    if (results.length === 0) {
      searchResult.html(
        '<div style="padding: 20px; text-align: center; color: #999;">' +
        '未找到包含 "<strong>' + query + '</strong>" 的文章' +
        '</div>'
      );
      return;
    }

    let html = '<div style="padding: 10px 0;">' +
      '<div style="padding: 0 15px 10px; color: #666; border-bottom: 1px solid #eee;">' +
      '找到 ' + results.length + ' 篇文章' +
      '</div>';

    results.forEach(function(item) {
      const post = item.post;
      const url = '/blog/' + post.slug + '/';

      // 高亮匹配的关键词
      const title = highlightKeywords(post.title, query);
      const excerpt = truncateText(post.excerpt || '', 100);

      html += '<div class="search-result-item" style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" data-url="' + url + '">' +
        '<a href="' + url + '" style="text-decoration: none; color: inherit; display: block;">' +
        '<h3 style="margin: 0 0 8px; font-size: 16px; color: #222;">' + title + '</h3>' +
        '<p style="margin: 0; font-size: 13px; color: #666; line-height: 1.5;">' + excerpt + '</p>' +
        '<div style="margin-top: 8px; font-size: 12px; color: #999;">' +
        '<span>' + new Date(post.pubDate).toLocaleDateString('zh-CN') + '</span>' +
        (post.tags && post.tags.length > 0 ? ' | <span>' + post.tags.join(', ') + '</span>' : '') +
        '</div>' +
        '</a>' +
        '</div>';
    });

    html += '</div>';
    searchResult.html(html);

    // 添加点击事件
    $('.search-result-item').on('click', function() {
      const url = $(this).data('url');
      if (url) {
        window.location.href = url;
      }
    });
  }

  // 高亮关键词
  function highlightKeywords(text, query) {
    const keywords = query.split(/\s+/).filter(k => k.trim().length > 0);
    let result = text;

    keywords.forEach(function(keyword) {
      const regex = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      result = result.replace(regex, '<mark style="background: #ffeb3b; padding: 0 2px;">$1</mark>');
    });

    return result;
  }

  // 截断文本
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  // 防抖函数
  let searchTimeout;
  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      performSearch(searchInput.val());
    }, 300);
  }

  // 加载搜索索引
  loadSearchIndex();

  // 搜索输入监听
  searchInput.on('input', function() {
    debounceSearch();
  });

  // 回车键搜索
  searchInput.on('keypress', function(e) {
    if (e.which === 13) {
      performSearch($(this).val());
    }
  });
});
