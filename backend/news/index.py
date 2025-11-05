'''
Business: News articles management - create, read, update, like
Args: event with httpMethod, body, queryStringParameters; context with request_id
Returns: HTTP response with articles data
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_time_ago(timestamp):
    now = datetime.now()
    diff = now - timestamp
    
    seconds = diff.total_seconds()
    if seconds < 60:
        return 'только что'
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f'{minutes} мин назад'
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f'{hours} ч назад'
    else:
        days = int(seconds / 86400)
        return f'{days} д назад'

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            user_id = params.get('user_id')
            category = params.get('category')
            search = params.get('search')
            author_id = params.get('author_id')
            
            query = '''
                SELECT 
                    n.id, n.title, n.content, n.excerpt, n.category, 
                    n.author_id, n.likes_count, n.created_at,
                    u.username as author_name, u.avatar_url as author_avatar,
                    u.subscribers_count, u.likes_count as author_total_likes,
                    u.publications_count,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'id', c.id,
                            'content', c.content,
                            'author_name', cu.username,
                            'author_avatar', cu.avatar_url,
                            'created_at', c.created_at
                        ) ORDER BY c.created_at DESC)
                        FROM comments c
                        JOIN users cu ON c.author_id = cu.id
                        WHERE c.article_id = n.id), '[]'::json
                    ) as comments
                FROM news_articles n
                JOIN users u ON n.author_id = u.id
                WHERE 1=1
            '''
            
            query_params = []
            
            if category:
                query += ' AND n.category = %s'
                query_params.append(category)
            
            if search:
                query += ' AND (n.title ILIKE %s OR n.content ILIKE %s OR u.username ILIKE %s)'
                search_param = f'%{search}%'
                query_params.extend([search_param, search_param, search_param])
            
            if author_id:
                query += ' AND n.author_id = %s'
                query_params.append(author_id)
            
            query += ' ORDER BY n.created_at DESC LIMIT 50'
            
            cur.execute(query, query_params)
            articles = [dict(row) for row in cur.fetchall()]
            
            for article in articles:
                article['date'] = get_time_ago(article['created_at'])
                article['created_at'] = article['created_at'].isoformat()
                
                article['is_liked'] = False
                if user_id:
                    cur.execute(
                        'SELECT 1 FROM likes WHERE article_id = %s AND user_id = %s',
                        (article['id'], user_id)
                    )
                    article['is_liked'] = cur.fetchone() is not None
                
                if article['comments']:
                    for comment in article['comments']:
                        comment['timestamp'] = get_time_ago(comment['created_at'])
                        comment['created_at'] = comment['created_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'articles': articles}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                title = body.get('title', '').strip()
                content = body.get('content', '').strip()
                category = body.get('category', '').strip()
                author_id = body.get('author_id')
                
                if not all([title, content, category, author_id]):
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Все поля обязательны'}),
                        'isBase64Encoded': False
                    }
                
                excerpt = content[:200] + '...' if len(content) > 200 else content
                
                cur.execute(
                    '''INSERT INTO news_articles (title, content, excerpt, category, author_id)
                       VALUES (%s, %s, %s, %s, %s)
                       RETURNING id, title, content, excerpt, category, author_id, likes_count, created_at''',
                    (title, content, excerpt, category, author_id)
                )
                article = dict(cur.fetchone())
                
                cur.execute(
                    'UPDATE users SET publications_count = publications_count + 1 WHERE id = %s',
                    (author_id,)
                )
                
                conn.commit()
                
                article['created_at'] = article['created_at'].isoformat()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({'article': article}),
                    'isBase64Encoded': False
                }
            
            elif action == 'like':
                article_id = body.get('article_id')
                user_id = body.get('user_id')
                
                if not article_id or not user_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'ID статьи и пользователя обязательны'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    'SELECT 1 FROM likes WHERE article_id = %s AND user_id = %s',
                    (article_id, user_id)
                )
                
                if cur.fetchone():
                    cur.execute(
                        'DELETE FROM likes WHERE article_id = %s AND user_id = %s',
                        (article_id, user_id)
                    )
                    cur.execute(
                        'UPDATE news_articles SET likes_count = likes_count - 1 WHERE id = %s',
                        (article_id,)
                    )
                    cur.execute(
                        '''UPDATE users SET likes_count = likes_count - 1 
                           WHERE id = (SELECT author_id FROM news_articles WHERE id = %s)''',
                        (article_id,)
                    )
                    is_liked = False
                else:
                    cur.execute(
                        'INSERT INTO likes (article_id, user_id) VALUES (%s, %s)',
                        (article_id, user_id)
                    )
                    cur.execute(
                        'UPDATE news_articles SET likes_count = likes_count + 1 WHERE id = %s',
                        (article_id,)
                    )
                    cur.execute(
                        '''UPDATE users SET likes_count = likes_count + 1 
                           WHERE id = (SELECT author_id FROM news_articles WHERE id = %s)''',
                        (article_id,)
                    )
                    is_liked = True
                
                conn.commit()
                
                cur.execute('SELECT likes_count FROM news_articles WHERE id = %s', (article_id,))
                result = cur.fetchone()
                likes_count = result['likes_count'] if result else 0
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'is_liked': is_liked, 'likes_count': likes_count}),
                    'isBase64Encoded': False
                }
            
            elif action == 'comment':
                article_id = body.get('article_id')
                author_id = body.get('author_id')
                content = body.get('content', '').strip()
                
                if not all([article_id, author_id, content]):
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Все поля обязательны'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    '''INSERT INTO comments (article_id, author_id, content)
                       VALUES (%s, %s, %s)
                       RETURNING id, content, created_at''',
                    (article_id, author_id, content)
                )
                comment = dict(cur.fetchone())
                
                cur.execute(
                    'SELECT username, avatar_url FROM users WHERE id = %s',
                    (author_id,)
                )
                user = dict(cur.fetchone())
                
                conn.commit()
                
                comment['author_name'] = user['username']
                comment['author_avatar'] = user['avatar_url']
                comment['timestamp'] = get_time_ago(comment['created_at'])
                comment['created_at'] = comment['created_at'].isoformat()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({'comment': comment}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Метод не поддерживается'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
