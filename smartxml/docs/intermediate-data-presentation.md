В данном примере мы в рассмотрим особенности промежуточного представления, обработку сложных случаев, а так же решение проблем с некорректной вложенностью данных в XML.

XML:
```
<books>
  <publisher>Elsevier</publisher>
  <book id="1">
    <title>The Origins of Totalitarianism</title>
    <author>Hannah Arendt</author>
  </book>
  <book id="2">
    <title>Alone in the Ocean</title>
    <author>Stanislav Kurilov</author>
  </book>
  <customer>
   <name>City Library</name>
  </customer>
</books>
```

Убедитесь, что в `config.txt` опция: `ignore-tag-attributes: false` установлена в `false`. Это необходимо для обработки атрибутов тегов (`book id="1"`). 

Обратите внимание, что сами узлы с атрибутами из которых будут извлекаться значений нужно добавить в `ignores/sample.txt` (`["books" "book"]`). При этом сами значения аттрибутов при `ignore-tag-attributes: false` будут извлечены.

По XML часто невозможно определить какой узел является одиночным, а какой массивом. Однако часто нам необходимо рассматривать некоторые узлы строго как массивы (или как таблицы).

В примере `books` имеет двух потомков и очевидно что он массив.

Однако из примера не ясно может ли у нас быть более одного `customer`.
Предположим что может.
Так же в примере `customer` имеет не корректную вложенность - он находится рядом с множественным узлом `book`.
Тогда мы должны создать некий контейнер который будет играть роль таблицы для `customer` и указать, что при первой встрече тега с именем `customer` должен быть создан контейнер-родитель, который будет играть роль таблицы (или имени массива). При каждой новой встрече тега `customer` контейнер-родитель будет дозаполняться.

Обратите внимание! Не каждое корректное промежуточное представление может быть транслировано в корректный SQL и JSON. Для генерации корректного SQL и JSON **вы должны учитывать особенности этих двух форматов, а так же правила описания и преобразования промежуточного представления!**. 
Поэтому попытка описать промежуточное представлене максимально дублируя структуру XML приведет к некорректной генерации результата.

Пример не корректного описания:
```
#[
    sample: #[
        sample_subcategory: #[   
            root_table: [        
                books_table: [  

                    my_guid: #guid  ; #guid - magic constant just for illustrative purposes
                    publisher: none  

                    book_node_name: [ 
                        book_id: none
                        title: none
                        author: none
                    ]
                ]

                customer_table: [  
                    customer_node_name: [ 
                        customer_name: none
                    ]
                ]

            ]
        ]
    ]
]
```

Подобная структура эквивалентна тому, как если бы попытались сгенерировать невалидный JSON со следующей структурой:
```
{
   "root_table": [
      "my_guid": "7C82697C-A28E-AA6D-C301-C075879D7180",
      "publisher": "Elsevier",
      [
        ...
      ]
   ]
}
```

Однако при этом промежуточное представление позволило бы создать валидный SQL:
```
INSERT INTO sample_subcategory ("my_guid", "publisher")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', 'Elsevier');

INSERT INTO books_table ("my_guid", "book_id", "title", "author")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', '1', 'The Origins of Totalitarianism', 'Hannah Arendt'),('7C82697C-A28E-AA6D-C301-C075879D7180', '2', 'Alone in the Ocean', 'Stanislav Kurilov');

INSERT INTO customer_table ("my_guid", "customer_name")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', 'City Library');
```

Пример корректного промежуточного промежуточного представления генерирующий корректный, но плохо пригодный для работы JSON:
```
#[
    sample: #[
        sample_subcategory: #[   
            my_guid: #guid   
            publisher: none          
            root_table: [        
                books_table: [        
                    book_node_name: [ 
                        book_id: none
                        title: none
                        author: none
                    ]
                ]

                customer_table: [         
                    customer_node_name: [ 
                        customer_name: none
                    ]
                ]

            ]
        ]
    ]
]
```

JSON:
```
{
   "my_guid": "7C82697C-A28E-AA6D-C301-C075879D7180",
   "publisher": "Elsevier",
   "root_table": [
      [
         {
            "my_guid": "7C82697C-A28E-AA6D-C301-C075879D7180",
            "book_id": "1",
            "title": "The Origins of Totalitarianism",
            "author": "Hannah Arendt"
         },
         {
            "my_guid": "7C82697C-A28E-AA6D-C301-C075879D7180",
            "book_id": "2",
            "title": "Alone in the Ocean",
            "author": "Stanislav Kurilov"
         }
      ],
      [
         {
            "my_guid": "7C82697C-A28E-AA6D-C301-C075879D7180",
            "customer_name": "City Library"
         }
      ]
   ]
}
```

SQL:
```
INSERT INTO sample_subcategory ("my_guid", "publisher")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', 'Elsevier');

INSERT INTO books_table ("my_guid", "book_id", "title", "author")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', '1', 'The Origins of Totalitarianism', 'Hannah Arendt'),('7C82697C-A28E-AA6D-C301-C075879D7180', '2', 'Alone in the Ocean', 'Stanislav Kurilov');

INSERT INTO customer_table ("my_guid", "customer_name")
 VALUES ('7C82697C-A28E-AA6D-C301-C075879D7180', 'City Library');

```

Однако не смотря на то, что JSON выше является валидным, он явно плохо подходит для работы т.к. в `root_table` мы получили два массива: `[[] []]`.

Однако промежуточное представление проигнорировать исходный уровень вложенности XML. Опишем данные данные подобным образом:

JSON:
```
#[
    sample: #[
        sample_subcategory: #[   
            my_guid: #guid   
            publisher: none          
            root_table: [ ; container for books         
                book_node_name: [ 
                    book_id: none
                    title: none
                    author: none
                ]
            ]

            customer_table: [ ; container for customers        
                customer_node_name: [ 
                    customer_name: none
                ]
            ]
        ]
    ]
]
```

JSON:
```
{
    "my_guid": "C381CBFE-32E0-5014-2030-559835FD4EF4",
    "publisher": "Elsevier",
    "root_table": [
        {
            "my_guid": "C381CBFE-32E0-5014-2030-559835FD4EF4",
            "book_id": "1",
            "title": "The Origins of Totalitarianism",
            "author": "Hannah Arendt"
        },
        {
            "my_guid": "C381CBFE-32E0-5014-2030-559835FD4EF4",
            "book_id": "2",
            "title": "Alone in the Ocean",
            "author": "Stanislav Kurilov"
        }
    ],
    "customer_table": [
        {
            "my_guid": "C381CBFE-32E0-5014-2030-559835FD4EF4",
            "customer_name": "City Library"
        }
    ]
}
```
Теперь массив `books` собирается отдельно от массива `customers`.

SQL:
```
INSERT INTO sample_subcategory ("my_guid", "publisher")
 VALUES ('C381CBFE-32E0-5014-2030-559835FD4EF4', 'Elsevier');

INSERT INTO root_table ("my_guid", "book_id", "title", "author")
 VALUES ('C381CBFE-32E0-5014-2030-559835FD4EF4', '1', 'The Origins of Totalitarianism', 'Hannah Arendt'),('C381CBFE-32E0-5014-2030-559835FD4EF4', '2', 'Alone in the Ocean', 'Stanislav Kurilov');

INSERT INTO customer_table ("my_guid", "customer_name")
 VALUES ('C381CBFE-32E0-5014-2030-559835FD4EF4', 'City Library');
```


`grow-rules.red`:

```
sample: [
    root_table: ["books"] ; We'll create the table when we encounter the tag `books` (it's root tag)
    book_node_name: ["book"] ; we need to indicate which names of multiple nodes
    customer_node_name: ["customer"] ; When we meet `customer` then `customer_node_name` will start filling the parent of `customer_table`
]
```

`tags-matching-rules.red`:

```
sample: #[
    publisher: [
        "books publisher"
    ]
    book_id: [
        "books book book_id"
    ]
    title: [
        "books book title"
    ]
    author: [
        "books book author"
    ]
    customer_name: [
        "books customer name"
    ]
]
```

`injection-rules.red`:
```
sample: [
    inject-tag-to-every-children: [my_guid] ; pass to all child nodes
    enumerate-nodes: [] 
    injection-tag-and-recipients: []
]
```
