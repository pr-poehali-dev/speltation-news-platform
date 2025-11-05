'''
Business: User authentication - registration, login, password change
Args: event with httpMethod, body; context with request_id
Returns: HTTP response with user data or error
'''

import json
import os
import hashlib
import secrets
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{pwd_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    salt, pwd_hash = stored_hash.split(':')
    check_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return check_hash == pwd_hash

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'register':
                username = body.get('username', '').strip()
                password = body.get('password', '')
                
                if not username or not password:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Имя пользователя и пароль обязательны'}),
                        'isBase64Encoded': False
                    }
                
                if len(username) < 3 or len(username) > 50:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Имя пользователя должно быть от 3 до 50 символов'}),
                        'isBase64Encoded': False
                    }
                
                if len(password) < 6:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Пароль должен быть минимум 6 символов'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    return {
                        'statusCode': 409,
                        'headers': headers,
                        'body': json.dumps({'error': 'Пользователь уже существует'}),
                        'isBase64Encoded': False
                    }
                
                password_hash = hash_password(password)
                cur.execute(
                    "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id, username, avatar_url, bio, subscribers_count, likes_count, publications_count, dark_theme, sound_enabled",
                    (username, password_hash)
                )
                user = dict(cur.fetchone())
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({'user': user}),
                    'isBase64Encoded': False
                }
            
            elif action == 'login':
                username = body.get('username', '').strip()
                password = body.get('password', '')
                
                if not username or not password:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Имя пользователя и пароль обязательны'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "SELECT id, username, password_hash, avatar_url, bio, subscribers_count, likes_count, publications_count, dark_theme, sound_enabled FROM users WHERE username = %s",
                    (username,)
                )
                result = cur.fetchone()
                
                if not result or not verify_password(password, result['password_hash']):
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'error': 'Неверное имя пользователя или пароль'}),
                        'isBase64Encoded': False
                    }
                
                user = dict(result)
                del user['password_hash']
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'user': user}),
                    'isBase64Encoded': False
                }
            
            elif action == 'change_password':
                user_id = body.get('user_id')
                old_password = body.get('old_password', '')
                new_password = body.get('new_password', '')
                
                if not user_id or not old_password or not new_password:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Все поля обязательны'}),
                        'isBase64Encoded': False
                    }
                
                if len(new_password) < 6:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Новый пароль должен быть минимум 6 символов'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
                result = cur.fetchone()
                
                if not result or not verify_password(old_password, result['password_hash']):
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'error': 'Неверный текущий пароль'}),
                        'isBase64Encoded': False
                    }
                
                new_hash = hash_password(new_password)
                cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'message': 'Пароль успешно изменен'}),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'ID пользователя обязателен'}),
                    'isBase64Encoded': False
                }
            
            updates = []
            params = []
            
            if 'dark_theme' in body:
                updates.append('dark_theme = %s')
                params.append(body['dark_theme'])
            
            if 'sound_enabled' in body:
                updates.append('sound_enabled = %s')
                params.append(body['sound_enabled'])
            
            if 'bio' in body:
                updates.append('bio = %s')
                params.append(body['bio'])
            
            if not updates:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Нет данных для обновления'}),
                    'isBase64Encoded': False
                }
            
            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, username, avatar_url, bio, subscribers_count, likes_count, publications_count, dark_theme, sound_enabled"
            
            cur.execute(query, params)
            user = dict(cur.fetchone())
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'user': user}),
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
