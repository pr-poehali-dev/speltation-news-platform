import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

type Badge = {
  id: string;
  name: string;
  icon: string;
  requirement: string;
};

type Author = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  subscribers: number;
  likes: number;
  badges: string[];
  isSubscribed: boolean;
};

type Comment = {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
};

type NewsArticle = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorAvatar: string;
  authorBadges: string[];
  date: string;
  likes: number;
  comments: Comment[];
  isLiked: boolean;
};

const BADGES: Badge[] = [
  { id: '1', name: 'Сердечко', icon: '❤️', requirement: '10+ подписчиков' },
  { id: '2', name: 'Меч', icon: '⚔️', requirement: '50+ лайков' },
  { id: '3', name: 'Звезда', icon: '⭐', requirement: '100+ публикаций' },
  { id: '4', name: 'Корона', icon: '👑', requirement: '500+ подписчиков' },
];

const INITIAL_AUTHORS: Author[] = [
  {
    id: '1',
    name: 'Александра Иванова',
    avatar: '/placeholder.svg',
    bio: 'Журналист, специализируюсь на технологиях и стартапах',
    subscribers: 245,
    likes: 1203,
    badges: ['1', '2', '4'],
    isSubscribed: false,
  },
  {
    id: '2',
    name: 'Дмитрий Петров',
    avatar: '/placeholder.svg',
    bio: 'Пишу о бизнесе, экономике и финансах',
    subscribers: 89,
    likes: 567,
    badges: ['1', '2'],
    isSubscribed: false,
  },
  {
    id: '3',
    name: 'Елена Смирнова',
    avatar: '/placeholder.svg',
    bio: 'Культура, искусство и городская жизнь',
    subscribers: 432,
    likes: 2341,
    badges: ['1', '2', '3', '4'],
    isSubscribed: true,
  },
];

const INITIAL_NEWS: NewsArticle[] = [
  {
    id: '1',
    title: 'Искусственный интеллект меняет индустрию медиа',
    excerpt: 'Новые технологии ИИ открывают невероятные возможности для журналистики и создания контента...',
    category: 'Технологии',
    author: 'Александра Иванова',
    authorAvatar: '/placeholder.svg',
    authorBadges: ['1', '2', '4'],
    date: '2 часа назад',
    likes: 342,
    comments: [],
    isLiked: false,
  },
  {
    id: '2',
    title: 'Рынок недвижимости: тренды 2025 года',
    excerpt: 'Эксперты делятся прогнозами о том, как будет развиваться рынок недвижимости в следующем году...',
    category: 'Бизнес',
    author: 'Дмитрий Петров',
    authorAvatar: '/placeholder.svg',
    authorBadges: ['1', '2'],
    date: '5 часов назад',
    likes: 187,
    comments: [],
    isLiked: false,
  },
  {
    id: '3',
    title: 'Выставка современного искусства открылась в центре города',
    excerpt: 'Более 50 художников представили свои работы на новой выставке, которая продлится до конца месяца...',
    category: 'Культура',
    author: 'Елена Смирнова',
    authorAvatar: '/placeholder.svg',
    authorBadges: ['1', '2', '3', '4'],
    date: '1 день назад',
    likes: 523,
    comments: [],
    isLiked: true,
  },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'authors'>('news');
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>(INITIAL_NEWS);
  const [authors, setAuthors] = useState<Author[]>(INITIAL_AUTHORS);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const handleLike = (articleId: string) => {
    setNews(news.map(article => 
      article.id === articleId 
        ? { ...article, isLiked: !article.isLiked, likes: article.isLiked ? article.likes - 1 : article.likes + 1 }
        : article
    ));
  };

  const handleSubscribe = (authorId: string) => {
    setAuthors(authors.map(author =>
      author.id === authorId
        ? { ...author, isSubscribed: !author.isSubscribed, subscribers: author.isSubscribed ? author.subscribers - 1 : author.subscribers + 1 }
        : author
    ));
  };

  const handleAddComment = (articleId: string) => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Вы',
      avatar: '/placeholder.svg',
      content: newComment,
      timestamp: 'только что',
    };

    setNews(news.map(article =>
      article.id === articleId
        ? { ...article, comments: [...article.comments, comment] }
        : article
    ));
    
    setNewComment('');
  };

  const filteredNews = news.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuthors = authors.filter(author =>
    author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    author.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBadgeIcon = (badgeId: string) => {
    const badge = BADGES.find(b => b.id === badgeId);
    return badge?.icon || '';
  };

  return (
    <div className="min-h-screen gradient-dark">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gradient">Speltation</h1>
            <Button className="gradient-purple">
              <Icon name="Plus" size={20} className="mr-2" />
              Создать
            </Button>
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
            {filteredNews.map((article, index) => (
              <Card
                key={article.id}
                className="p-6 bg-card border-border hover:border-primary/50 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={article.authorAvatar} />
                      <AvatarFallback>{article.author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{article.author}</p>
                        <div className="flex gap-1">
                          {article.authorBadges.map(badgeId => (
                            <span key={badgeId} className="text-sm">
                              {getBadgeIcon(badgeId)}
                            </span>
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

                <h2 className="text-2xl font-bold mb-3 text-foreground hover:text-primary transition-colors cursor-pointer">
                  {article.title}
                </h2>
                <p className="text-muted-foreground mb-4">{article.excerpt}</p>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(article.id)}
                    className={article.isLiked ? 'text-red-500' : ''}
                  >
                    <Icon name={article.isLiked ? 'Heart' : 'Heart'} size={18} className="mr-2" fill={article.isLiked ? 'currentColor' : 'none'} />
                    {article.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArticle(selectedArticle === article.id ? null : article.id)}
                  >
                    <Icon name="MessageCircle" size={18} className="mr-2" />
                    {article.comments.length}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Icon name="Share2" size={18} className="mr-2" />
                    Поделиться
                  </Button>
                </div>

                {selectedArticle === article.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>Вы</AvatarFallback>
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

                    <div className="space-y-3">
                      {article.comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 animate-scale-in">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.avatar} />
                            <AvatarFallback>{comment.author[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{comment.author}</p>
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
            ))}
          </div>
        )}

        {activeTab === 'authors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredAuthors.map((author, index) => (
              <Card
                key={author.id}
                className="p-6 bg-card border-border hover:border-primary/50 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-24 h-24 mb-4 border-2 border-primary/50">
                    <AvatarImage src={author.avatar} />
                    <AvatarFallback className="text-2xl">{author.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{author.name}</h3>
                    <div className="flex gap-1">
                      {author.badges.map(badgeId => (
                        <span key={badgeId} className="text-lg">
                          {getBadgeIcon(badgeId)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4 text-sm">{author.bio}</p>

                  <div className="flex gap-6 mb-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{author.subscribers}</p>
                      <p className="text-muted-foreground">Подписчики</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">{author.likes}</p>
                      <p className="text-muted-foreground">Лайки</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSubscribe(author.id)}
                    className={author.isSubscribed ? 'w-full' : 'w-full gradient-purple'}
                    variant={author.isSubscribed ? 'outline' : 'default'}
                  >
                    <Icon name={author.isSubscribed ? 'Check' : 'UserPlus'} size={18} className="mr-2" />
                    {author.isSubscribed ? 'Вы подписаны' : 'Подписаться'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gradient mb-2">Speltation</h2>
              <p className="text-muted-foreground text-sm">Платформа для публикации новостей</p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <div className="text-center">
                <p className="font-bold text-foreground">Значки достижений</p>
                <div className="flex gap-2 mt-2">
                  {BADGES.map(badge => (
                    <div key={badge.id} className="group relative">
                      <span className="text-2xl cursor-help">{badge.icon}</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        <p className="font-semibold">{badge.name}</p>
                        <p className="text-muted-foreground">{badge.requirement}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
