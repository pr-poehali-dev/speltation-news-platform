'''
Business: User profiles and subscriptions management
Args: event with httpMethod, body, queryStringParameters; context with request_id
Returns: HTTP response with user data
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            current_user_id = params.get('current_user_id')
            search = params.get('search')
            
            query = '''
                SELECT 
                    id, username, avatar_url, bio,
                    subscribers_count, likes_count, publications_count
                FROM users
                WHERE 1=1
            '''
            
            query_params = []
            
            if search:
                query += ' AND (username ILIKE %s OR bio ILIKE %s)'
                search_param = f'%{search}%'
                query_params.extend([search_param, search_param])
            
            query += ' ORDER BY subscribers_count DESC LIMIT 50'
            
            cur.execute(query, query_params)
            users = [dict(row) for row in cur.fetchall()]
            
            if current_user_id:
                for user in users:
                    cur.execute(
                        'SELECT 1 FROM subscriptions WHERE subscriber_id = %s AND author_id = %s',
                        (current_user_id, user['id'])
                    )
                    user['is_subscribed'] = cur.fetchone() is not None
            else:
                for user in users:
                    user['is_subscribed'] = False
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'users': users}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'subscribe':
                subscriber_id = body.get('subscriber_id')
                author_id = body.get('author_id')
                
                if not subscriber_id or not author_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'ID подписчика и автора обязательны'}),
                        'isBase64Encoded': False
                    }
                
                if subscriber_id == author_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Нельзя подписаться на самого себя'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    'SELECT 1 FROM subscriptions WHERE subscriber_id = %s AND author_id = %s',
                    (subscriber_id, author_id)
                )
                
                if cur.fetchone():
                    cur.execute(
                        'DELETE FROM subscriptions WHERE subscriber_id = %s AND author_id = %s',
                        (subscriber_id, author_id)
                    )
                    cur.execute(
                        'UPDATE users SET subscribers_count = subscribers_count - 1 WHERE id = %s',
                        (author_id,)
                    )
                    is_subscribed = False
                else:
                    cur.execute(
                        'INSERT INTO subscriptions (subscriber_id, author_id) VALUES (%s, %s)',
                        (subscriber_id, author_id)
                    )
                    cur.execute(
                        'UPDATE users SET subscribers_count = subscribers_count + 1 WHERE id = %s',
                        (author_id,)
                    )
                    is_subscribed = True
                
                conn.commit()
                
                cur.execute('SELECT subscribers_count FROM users WHERE id = %s', (author_id,))
                result = cur.fetchone()
                subscribers_count = result['subscribers_count'] if result else 0
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'is_subscribed': is_subscribed, 'subscribers_count': subscribers_count}),
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
