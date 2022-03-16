module.exports = 
{
  discord: { // discordに出力されるもの
    ready: '[log] 起動しました',
    connectionOpen: '[log] $1 : 接続を開始しました', // $1: 繋いだ人のプレイヤー名
    connectionClose: '[log] 接続が終了しました',
    chat: '[Minecraft] <$1> $2', // $1: プレイヤー名, $2: メッセージ
    me: '[Minecraft] * $1 $2', // $1: プレイヤー名, $2 メッセージ
    say: '[Minecraft] $1', // $1: プレイヤー名とメッセージ
    list: '現在の人数: $1/$2\nプレイヤー:\n$3', // $1: 現在の人数, $2: 最大人数, $3: プレイヤー一覧
    join: 'Joined: $1  ||  $2/$3', // $1: 参加したプレイヤー, $2: 現在の人数, $3: 最大人数
    leave: 'Left: $1  ||  $2/$3' // $1: 退出したプレイヤー, $2: 現在の人数, $3: 最大人数
  },
  minecraft: { // Minecraftに出力されるもの
    chat: '§b[Discord] $1 : $2', // $1: ユーザー名, $2: メッセージ
    file: '§b[Discord] $1 : [$2 file]', // $1: ユーザー名, $2: ファイル拡張子
    command: '§a[Discord] $1 : $2' // $1: ユーザー名, $2: コマンド
  }
}
