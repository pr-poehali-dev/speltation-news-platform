import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = {
  auth: 'https://functions.poehali.dev/956abd89-9073-46b8-b12a-0eb31168eec6',
  news: 'https://functions.poehali.dev/7edfd204-420f-49d9-8ed3-9e7100116821',
  users: 'https://functions.poehali.dev/8adf62f7-3ea3-4c9a-a922-42649ef9aeef',
};

type User = {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  subscribers_count: number;
  likes_count: number;
  publications_count: number;
  dark_theme: boolean;
  sound_enabled: boolean;
  is_subscribed?: boolean;
};

type Comment = {
  id: number;
  content: string;
  author_name: string;
  author_avatar: string | null;
  timestamp: string;
};

type NewsArticle = {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  subscribers_count: number;
  author_total_likes: number;
  publications_count: number;
  date: string;
  likes_count: number;
  comments: Comment[];
  is_liked: boolean;
};

const BADGES = [
  { id: '1', name: 'Сердечко', icon: '❤️', requirement: '10+ подписчиков', check: (u: User) => u.subscribers_count >= 10 },
  { id: '2', name: 'Меч', icon: '⚔️', requirement: '50+ лайков', check: (u: User) => u.likes_count >= 50 },
  { id: '3', name: 'Звезда', icon: '⭐', requirement: '100+ публикаций', check: (u: User) => u.publications_count >= 100 },
  { id: '4', name: 'Корона', icon: '👑', requirement: '500+ подписчиков', check: (u: User) => u.subscribers_count >= 500 },
];

const CATEGORIES = ['Технологии', 'Бизнес', 'Культура', 'Наука', 'Спорт', 'Политика', 'Образование', 'Другое'];

const playSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUhMNTKXh8LVjHAU2jdXyzn0vBSh+zPLaizsKF2O56+mmWBQLRp/g8r5sIQUrgc7y2Yk2CBhkuezooVITDUyl4fC1YxwFNo3V8s59LwUofszy2os7ChdjuevpplgVC0af4PK+bCEFK4HO8tmJNggYZLns6KFSEw1MpeHwtWMcBTaN1fLOfS8FKH7M8tqLOwoxXrPp66hTEwpHnuDyvmwhBSuBzvLZiTYIGGS57OihUhMNTKXh8LVjHAU2jdXyzn0vBSh+zPLaizsKMV6z6euoUxMKR57g8r5sIQUrgc7y2Yk2CBhkuezooVITDUyl4fC1YxwFNo3V8s59LwUofszy2os7CjFes+nrqFMTCkee4PK+bCEFK4HO8tmJNggYZLns6KFSEw1MpeHwtWMcBTaN1fLOfS8FKH7M8tqLOwoxXrPp66hTEwpHnuDyvmwhBSuBzvLZiTYIGGS57OihUhMNTKXh8LVjHAU2jdXyzn0vBSh+zPLaizsKMV6z6euoUxMKR57g8r5sIQUrgc7y2Yk2CBhkuezooVITDUyl4fC1YxwFNo3V8s59LwUofszy2os7');
  audio.play().catch(() => {});
};

const Index = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'news' | 'authors'>('news');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  const [showCreateNews, setShowCreateNews] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Технологии');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('speltation_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    loadNews();
    loadAuthors();
  }, []);

  useEffect(() => {
    loadNews();
    loadAuthors();
  }, [currentUser]);

  const loadNews = async () => {
    try {
      const userId = currentUser?.id || '';
      const response = await fetch(`${API_BASE.news}?user_id=${userId}`);
      const data = await response.json();
      setNews(data.articles || []);
    } catch (error) {
      console.error('Error loading news:', error);
    }
  };

  const loadAuthors = async () => {
    try {
      const userId = currentUser?.id || '';
      const response = await fetch(`${API_BASE.users}?current_user_id=${userId}`);
      const data = await response.json();
      setAuthors(data.users || []);
    } catch (error) {
      console.error('Error loading authors:', error);
    }
  };

  const handleAuth = async () => {
    if (!authUsername || !authPassword) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: authUsername,
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }

      setCurrentUser(data.user);
      localStorage.setItem('speltation_user', JSON.stringify(data.user));
      setShowAuth(false);
      setAuthUsername('');
      setAuthPassword('');
      toast({ title: 'Успешно', description: authMode === 'login' ? 'Вы вошли в систему' : 'Регистрация завершена' });
      
      if (data.user.sound_enabled) playSound();
      
      loadNews();
      loadAuthors();
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('speltation_user');
    toast({ title: 'Вы вышли из системы' });
    loadNews();
    loadAuthors();
  };

  const handleCreateNews = async () => {
    if (!currentUser) {
      toast({ title: 'Ошибка', description: 'Войдите для создания публикаций', variant: 'destructive' });
      return;
    }

    if (!newTitle || !newContent) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE.news, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTitle,
          content: newContent,
          category: newCategory,
          author_id: currentUser.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }

      setShowCreateNews(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('Технологии');
      toast({ title: 'Успешно', description: 'Новость опубликована!' });
      
      if (currentUser.sound_enabled) playSound();
      
      loadNews();
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (articleId: number) => {
    if (!currentUser) {
      toast({ title: 'Войдите для лайков', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_BASE.news, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like',
          article_id: articleId,
          user_id: currentUser.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNews(news.map(article =>
          article.id === articleId
            ? { ...article, is_liked: data.is_liked, likes_count: data.likes_count }
            : article
        ));
        
        if (currentUser.sound_enabled) playSound();
      }
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  const handleSubscribe = async (authorId: number) => {
    if (!currentUser) {
      toast({ title: 'Войдите для подписки', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_BASE.users, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscriber_id: currentUser.id,
          author_id: authorId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthors(authors.map(author =>
          author.id === authorId
            ? { ...author, is_subscribed: data.is_subscribed, subscribers_count: data.subscribers_count }
            : author
        ));
        
        if (currentUser.sound_enabled) playSound();
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const handleAddComment = async (articleId: number) => {
    if (!currentUser) {
      toast({ title: 'Войдите для комментариев', variant: 'destructive' });
      return;
    }

    if (!newComment.trim()) return;

    try {
      const response = await fetch(API_BASE.news, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          article_id: articleId,
          author_id: currentUser.id,
          content: newComment,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNews(news.map(article =>
          article.id === articleId
            ? { ...article, comments: [...article.comments, data.comment] }
            : article
        ));
        setNewComment('');
        
        if (currentUser.sound_enabled) playSound();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleUpdateSettings = async (updates: Partial<User>) => {
    if (!currentUser) return;

    try {
      const response = await fetch(API_BASE.auth, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          ...updates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('speltation_user', JSON.stringify(data.user));
        toast({ title: 'Настройки сохранены' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser || !oldPassword || !newPassword) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_BASE.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          user_id: currentUser.id,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
        toast({ title: 'Пароль изменен' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const getUserBadges = (user: User | { subscribers_count: number; author_total_likes: number; publications_count: number }) => {
    return BADGES.filter(badge => {
      const u = { 
        subscribers_count: user.subscribers_count, 
        likes_count: 'author_total_likes' in user ? user.author_total_likes : (user as User).likes_count,
        publications_count: user.publications_count 
      } as User;
      return badge.check(u);
    });
  };

  const filteredNews = news.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.author_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAuthors = authors.filter(author =>
    author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (author.bio && author.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen gradient-dark">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gradient">Speltation</h1>
            
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <Dialog open={showCreateNews} onOpenChange={setShowCreateNews}>
                    <DialogTrigger asChild>
                      <Button className="gradient-purple">
                        <Icon name="Plus" size={20} className="mr-2" />
                        Создать
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Новая публикация</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Заголовок</Label>
                          <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Введите заголовок..."
                            className="bg-secondary/50"
                          />
                        </div>
                        <div>
                          <Label>Категория</Label>
                          <Select value={newCategory} onValueChange={setNewCategory}>
                            <SelectTrigger className="bg-secondary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Содержание</Label>
                          <Textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="Напишите вашу новость..."
                            className="bg-secondary/50 min-h-[200px]"
                          />
                        </div>
                        <Button
                          onClick={handleCreateNews}
                          disabled={loading}
                          className="w-full gradient-purple"
                        >
                          {loading ? 'Публикация...' : 'Опубликовать'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Avatar className="w-9 h-9 border-2 border-primary/50">
                          <AvatarImage src={currentUser.avatar_url || '/placeholder.svg'} />
                          <AvatarFallback>{currentUser.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => setShowSettings(true)}>
                        <Icon name="Settings" size={16} className="mr-2" />
                        Настройки
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                        <Icon name="KeyRound" size={16} className="mr-2" />
                        Сменить пароль
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <Icon name="LogOut" size={16} className="mr-2" />
                        Выйти
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Dialog open={showAuth && authMode === 'register'} onOpenChange={(open) => { setShowAuth(open); if (open) setAuthMode('register'); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-primary/50">
                        <Icon name="UserPlus" size={20} className="mr-2" />
                        Регистрация
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Регистрация</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Имя пользователя</Label>
                          <Input
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            placeholder="Введите ник..."
                            className="bg-secondary/50"
                          />
                        </div>
                        <div>
                          <Label>Пароль</Label>
                          <Input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="Введите пароль..."
                            className="bg-secondary/50"
                          />
                        </div>
                        <Button
                          onClick={handleAuth}
                          disabled={loading}
                          className="w-full gradient-purple"
                        >
                          {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setAuthMode('login')}
                          className="w-full"
                        >
                          Есть аккаунт? Войти
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAuth && authMode === 'login'} onOpenChange={(open) => { setShowAuth(open); if (open) setAuthMode('login'); }}>
                    <DialogTrigger asChild>
                      <Button className="gradient-purple">
                        <Icon name="LogIn" size={20} className="mr-2" />
                        Войти
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Вход</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Имя пользователя</Label>
                          <Input
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            placeholder="Введите ник..."
                            className="bg-secondary/50"
                          />
                        </div>
                        <div>
                          <Label>Пароль</Label>
                          <Input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="Введите пароль..."
                            className="bg-secondary/50"
                          />
                        </div>
                        <Button
                          onClick={handleAuth}
                          disabled={loading}
                          className="w-full gradient-purple"
                        >
                          {loading ? 'Загрузка...' : 'Войти'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setAuthMode('register')}
                          className="w-full"
                        >
                          Нет аккаунта? Регистрация
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Icon name="Search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск новостей и авторов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
              />
            </div>
            
            {activeTab === 'news' && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'news' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('news')}
                className={activeTab === 'news' ? 'gradient-purple' : ''}
              >
                <Icon name="Newspaper" size={20} className="mr-2" />
                Новости
              </Button>
              <Button
                variant={activeTab === 'authors' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('authors')}
                className={activeTab === 'authors' ? 'gradient-purple' : ''}
              >
                <Icon name="Users" size={20} className="mr-2" />
                Авторы
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'news' && (
          <div className="space-y-6 animate-fade-in">
            {filteredNews.length === 0 ? (
              <Card className="p-12 text-center bg-card border-border">
                <Icon name="Newspaper" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg mb-2">Нет новостей</p>
                <p className="text-sm text-muted-foreground">Будьте первым, кто опубликует новость!</p>
              </Card>
            ) : (
              filteredNews.map((article, index) => (
                <Card
                  key={article.id}
                  className="p-6 bg-card border-border hover:border-primary/50 transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={article.author_avatar || '/placeholder.svg'} />
                        <AvatarFallback>{article.author_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{article.author_name}</p>
                          <div className="flex gap-1">
                            {getUserBadges(article).map(badge => (
                              <span key={badge.id} className="text-sm" title={badge.name}>{badge.icon}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{article.date}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      {article.category}
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-bold mb-3 text-foreground">{article.title}</h2>
                  <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{article.excerpt}</p>

                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(article.id)}
                      className={article.is_liked ? 'text-red-500' : ''}
                    >
                      <Icon name="Heart" size={18} className="mr-2" fill={article.is_liked ? 'currentColor' : 'none'} />
                      {article.likes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(selectedArticle === article.id ? null : article.id)}
                    >
                      <Icon name="MessageCircle" size={18} className="mr-2" />
                      {article.comments.length}
                    </Button>
                  </div>

                  {selectedArticle === article.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
                      {currentUser && (
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={currentUser.avatar_url || '/placeholder.svg'} />
                            <AvatarFallback>{currentUser.username[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <Textarea
                              placeholder="Написать комментарий..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="resize-none bg-secondary/50 border-border"
                              rows={2}
                            />
                            <Button
                              onClick={() => handleAddComment(article.id)}
                              size="sm"
                              className="gradient-purple"
                            >
                              <Icon name="Send" size={16} />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {article.comments.map(comment => (
                          <div key={comment.id} className="flex gap-3 animate-scale-in">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={comment.author_avatar || '/placeholder.svg'} />
                              <AvatarFallback>{comment.author_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">{comment.author_name}</p>
                                <p className="text-xs text-muted-foreground">{comment.timestamp}</p>
                              </div>
                              <p className="text-sm text-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'authors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredAuthors.length === 0 ? (
              <Card className="p-12 text-center bg-card border-border col-span-full">
                <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Нет авторов</p>
              </Card>
            ) : (
              filteredAuthors.map((author, index) => (
                <Card
                  key={author.id}
                  className="p-6 bg-card border-border hover:border-primary/50 transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4 border-2 border-primary/50">
                      <AvatarImage src={author.avatar_url || '/placeholder.svg'} />
                      <AvatarFallback className="text-2xl">{author.username[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{author.username}</h3>
                      <div className="flex gap-1">
                        {getUserBadges(author).map(badge => (
                          <span key={badge.id} className="text-lg" title={badge.name}>{badge.icon}</span>
                        ))}
                      </div>
                    </div>

                    {author.bio && <p className="text-muted-foreground mb-4 text-sm">{author.bio}</p>}

                    <div className="flex gap-6 mb-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-foreground">{author.subscribers_count}</p>
                        <p className="text-muted-foreground">Подписчики</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{author.likes_count}</p>
                        <p className="text-muted-foreground">Лайки</p>
                      </div>
                    </div>

                    {currentUser && currentUser.id !== author.id && (
                      <Button
                        onClick={() => handleSubscribe(author.id)}
                        className={author.is_subscribed ? 'w-full' : 'w-full gradient-purple'}
                        variant={author.is_subscribed ? 'outline' : 'default'}
                      >
                        <Icon name={author.is_subscribed ? 'Check' : 'UserPlus'} size={18} className="mr-2" />
                        {author.is_subscribed ? 'Вы подписаны' : 'Подписаться'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
          </DialogHeader>
          {currentUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Тёмная тема</Label>
                <Switch
                  checked={currentUser.dark_theme}
                  onCheckedChange={(checked) => handleUpdateSettings({ dark_theme: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Звуковое сопровождение</Label>
                <Switch
                  checked={currentUser.sound_enabled}
                  onCheckedChange={(checked) => handleUpdateSettings({ sound_enabled: checked })}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Текущий пароль</Label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div>
              <Label>Новый пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full gradient-purple">
              Изменить пароль
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="mt-16 border-t border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gradient mb-2">Speltation</h2>
              <p className="text-muted-foreground text-sm">Платформа для публикации новостей</p>
            </div>

            <div className="text-center">
              <p className="font-bold text-foreground mb-2">Значки достижений</p>
              <div className="flex gap-3">
                {BADGES.map(badge => (
                  <div key={badge.id} className="group relative">
                    <span className="text-2xl cursor-help">{badge.icon}</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border">
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-muted-foreground">{badge.requirement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
