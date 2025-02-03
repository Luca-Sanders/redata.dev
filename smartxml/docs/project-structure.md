All projects must be located in the `projects` folder.
For installation version `projects` is located in user's HOME directory inside `SmartXML` directory.
If the Portable version is used, the `projects` folder must be located next to the program and have write permissions.

Комментарии начинаются с символа `;`.

`Directory structure:`
```
projects/
└── sample-project/
    ├── templates/
    │   └── data-templates.red    
    ├── ignores/
    │   └── section_name.txt
    ├── rules/
    │   ├── tags-matching-rules.red
    │   ├── grow-rules.red
    │   ├── injection-rules.red
    │   ├── db-constraints-rules.red
    │   ├── tags-casting-rules.red
    │   ├── complex-extract-rules.red
    ├── config.txt
    └── job.txt
````

Пример XML для разбора:
```
    <data>
      <account>
        <miscInfo>Some miscellaneous information</miscInfo>
        <ownerName>John Doe</ownerName>
        <accountId>94967295</accountId>
        <phoneNumber>+1234567890</phoneNumber>
        <email>johndoe@example.com</email>
        <preferredLanguage>English</preferredLanguage>
        <themePreference>Dark</themePreference>
        <bankInfo>
          <bankName>Bank of America</bankName>
          <branchCode>001</branchCode>
          <accountType>Personal</accountType>
        </bankInfo>
      </account>
      <transactions>
        <transaction>
            <amount>1200.00</amount>
            <currency>USD</currency>
            <transactionID>TX1003047</transactionID>
            <networkProvider>XYZ Telecom</networkProvider>
        </transaction>
        <transaction>
            <amount>2700.00</amount>
            <currency>USD</currency>
            <transactionID>TX1003048</transactionID>
            <networkProvider>XYZ Telecom</networkProvider>
        </transaction>        
      </transactions>
    </data>
```


Для того, чтобы выполнить разбор XML нужно описать его в промежуточном представлении и задать в rules правила преобразования данного представления.

Промежуточное представление описывается в файле: `data-templates.red`.
В минимальном варианте обязательно наличие как минимум одной секции и одной подсекции.
Секции представляют из себя отдельные типы XML документов. Подсекции - подтипы.
Для каждой отдельной секции возможно задать уникальные правила преобразования XML документа.
Для всех подсекций используются правила разбора и преобразования от родительской секции.
Имя подсекции используется как имя таблицы при преобразовании в SQL для данных расположенных в корне XML.

Пример `data-templates.red` содержащего одну секцию и одну подсекцию. Промежуточное представление данных не описано:
```
#[
    section_name: #[
        subsection_name: #[

        ]
    ]
]
```
Пример двух секций (типов XML). У второй секции два подтипа XML.

```
#[
    section_name: #[
        subsection_name: #[]
    ]
    section2_name: #[
        subsection1_name: #[]
        subsection2_name: #[]
    ]
]
```

Для каждого правила в папке `rules` обязательно должна быть создана секций, даже если это правило не используется.

Каждый подтип должен содержать описание структуры XML в промежуточном формате. Структура промежуточного формата описана ниже.

Все узлы которые необходимо представить как таблицы (или как массивы JSON) должны быть иметь родителя, который будет использован как имя таблицы (или имя массива в случае с JSON). Пример:
```
parent_name: [ ; name of table or name of json array
   node_name: [ ; XML node for which one can specify the multiplicity that become row (or JSON object)

   ]
]
```

Все значения которые нужно извлечь должны быть описаны в формате: `имя_значения: none`
Имена значений будут использованы как имена столбцов базы данных (в случае преобразования в SQL) или как имена полей JSON (в случае преобразования к JSON).

Ниже представлен пример заполненного `data-templates.red` из которого можно сгенерировать три таблицы (bank_transaction, banks, transactions) и два массива JSON (banks и transactions).

```
#[
   section_name: #[
        bank_transaction: #[ ; имя подсекции используется как имя таблицы 
            owner_name: none
            account_id: none
            phone_number: none
            email: none
            banks: [ ; родитель узла имеющего прямым потомком другой узел используется как имя таблицы (или массива JSON)
              bank: [
                bank_name: none
                branch_code: none
                account_type: none
              ]
            ]
            transactions: [ ; родитель узла имеющего прямым потомком другой узел используется как имя таблицы (или массива JSON)
                transaction: [
                    amount: none 
                    currency: none 
                    tid: none
                ]
              ]
      ]

  ]        
]
```

В `tags-matching-rules.red` описывается отношения имен в промежуточном представлении с последовательностью узлов (цепочек тегов) до целевых данных.

Если в XML имеются разные варианты написания одних и тех же узлов их все можно указать (как в примере с tid).
Все названия узлов должны быть уникальными.

Пример заполнения: `tags-matching-rules.red`
```
section_name:  #[
        owner_name: [
          "data account ownerName" 
        ]
        account_id: [
          "data account accountId"         
        ]
        phone_number: [
          "data account phoneNumber" 
        ]
        email: [
          "data account email" 
        ]
        bank_name: [
          "data account bankInfo bankName" 
        ]
        branch_code: [
          "data account bankInfo branchCode" 
        ]
        account_type: [
          "data account bankInfo accountType" 
        ]
        amount: [
          "data transactions transaction amount" 
        ] 
        currency: [
           "data transactions transaction currency" 
        ] 
        tid: [
          "data transactions transaction transactionID" 
          "data transactions transaction alternativeTransactionIdSpelling" 
        ]
]  
```  

Если в XML присутствуют узлы значения которых нам не требуются в каталоге `ignores` для каждой секции создается файл в котором описывается последовательность узлов которые необходимо проигнорировать.
Пример содержимого `section_name.txt`:

```
["data" "account" "miscInfo"]
["data" "account" "preferredLanguage"]
["data" "account" "themePreference"]
["data" "transactions" "transaction" "networkProvider"]
```

В `grow-rules.red` указываются имена узлов в промежуточном представлении и их варианты написания в XML. Без данного правила  при встрече узлов приложение будет их пропускать.

Корректная достройка узлов происходит благодаря правилу `grow-rules.red`:
```
section_name: [
    transaction: ["transaction" "transactionSpellingA" "transactionSpellingB"] 
    bank: ["bankInfo"]
]
```

Пример сгенерированного без этого правила JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com"
}
```
Пример сгенерированного без этого правила SQL:
```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');
```



Сгенерированный JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

Сгенерированный SQL:
```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("bank_name", "branch_code", "account_type")
 VALUES ('Bank of America', '001', 'Personal');

INSERT INTO transactions ("amount", "currency", "tid")
 VALUES ('1200.00', 'USD', 'TX1003047'),('2700.00', 'USD', 'TX1003048');

```

В случае если вложенность узлов не указать подобным образом, а описать опираясь на структуру XML 1к1 т.е. пропустить `banks`:
```
#[
   section_name: #[
        bank_transaction: #[
            owner_name: none
            account_id: none
            phone_number: none
            email: none
            bank: [
                bank_name: none
                branch_code: none
                account_type: none
              ]
              transactions: [
                transaction: [
                    amount: none 
                    currency: none 
                    tid: none
                ]
              ]
      ]

  ]        
]
```

То при генерации SQL и JSON содержимое `bank` будет проигнорировано:

Пример JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "transactions": [
      {
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}

```

Пример SQL:
```

INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com'),('Bank of America', '001', 'Personal');

INSERT INTO transactions ("amount", "currency", "tid")
 VALUES ('1200.00', 'USD', 'TX1003047'),('2700.00', 'USD', 'TX1003048');


```


Если содержимое `bank` не требует необходимости хранения в отдельной таблице (или массиве JSON), то узел `bank` должен быть опущен:

```
#[
   section_name: #[
        bank_transaction: #[
            owner_name: none
            account_id: none
            phone_number: none
            email: none

            bank_name: none
            branch_code: none
            account_type: none

            transactions: [
                transaction: [
                    amount: none 
                    currency: none 
                    tid: none
                ]
              ]
      ]

  ]        
]
```

JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "bank_name": "Bank of America",
   "branch_code": "001",
   "account_type": "Personal",
   "transactions": [
      {
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

SQL:
```

INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email", "bank_name", "branch_code", "account_type")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com', 'Bank of America', '001', 'Personal');

INSERT INTO transactions ("amount", "currency", "tid")
 VALUES ('1200.00', 'USD', 'TX1003047'),('2700.00', 'USD', 'TX1003048');

```

Восстановим оригинальную структу `data-templates.red`:
```
#[
   section_name: #[
        bank_transaction: #[ ; имя подсекции используется как имя таблицы 
            owner_name: none
            account_id: none
            phone_number: none
            email: none
            banks: [ ; родитель узла имеющего прямым потомком другой узел используется как имя таблицы (или массива JSON)
              bank: [
                bank_name: none
                branch_code: none
                account_type: none
              ]
            ]
            transactions: [ ; родитель узла имеющего прямым потомком другой узел используется как имя таблицы (или массива JSON)
                transaction: [
                    amount: none 
                    currency: none 
                    tid: none
                ]
              ]
      ]

  ]        
]
```




`injection-rules.red` позволяет передавать потомкам значения от родителей:
```
section_name: [
  inject-tag-to-every-children: [account_id] 
  injection-tag-and-recipients: []
  enumerate-nodes: [] 
] 
```

При использовании данного правила `account_id` будет передан всем потомкам уровнем ниже.
JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "account_id": "94967295",
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "account_id": "94967295",
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "account_id": "94967295",
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

SQL:
```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("account_id", "bank_name", "branch_code", "account_type")
 VALUES ('94967295', 'Bank of America', '001', 'Personal');

INSERT INTO transactions ("account_id", "amount", "currency", "tid")
 VALUES ('94967295', '1200.00', 'USD', 'TX1003047'),('94967295', '2700.00', 'USD', 'TX1003048');
```

Существует возможность передать теги только в определенные потомки.
`injection-rules.red`:
```
section_name: [
  inject-tag-to-every-children: [] 
  injection-tag-and-recipients: [
     account_id: [transaction] 
     owner_name: [bank transaction]
  ]
  enumerate-nodes: [] 
] 
```
В данном случае `account_id` будет передан только в `transactions`, а `owner_name` в узел `banks` и `transactions`.

JSON:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "owner_name": "John Doe",
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "owner_name": "John Doe",
         "account_id": "94967295",
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "owner_name": "John Doe",
         "account_id": "94967295",
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

SQL:

```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("owner_name", "bank_name", "branch_code", "account_type")
 VALUES ('John Doe', 'Bank of America', '001', 'Personal');

INSERT INTO transactions ("owner_name", "account_id", "amount", "currency", "tid")
 VALUES ('John Doe', '94967295', '1200.00', 'USD', 'TX1003047'),('John Doe', '94967295', '2700.00', 'USD', 'TX1003048');
```


Обратите внамание, что необходимо указывать именно наименование конечных узлов в промежуточном представлении. Поэтому не `transactions`, а `transaction`, не `banks`, а `bank`.

Так же у нас есть возможность пронумеровать множественные узлы вставив туда значение: `item_number`.

Правило будет выглядеть следующим образом:
```
section_name: [
  inject-tag-to-every-children: [] 
  enumerate-nodes: [transaction] 
  injection-tag-and-recipients: []
] 
```

Результат:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "item_number": 1,
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "item_number": 2,
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

SQL:
```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("bank_name", "branch_code", "account_type")
 VALUES ('Bank of America', '001', 'Personal');

INSERT INTO transactions ("item_number", "amount", "currency", "tid")
 VALUES (1, '1200.00', 'USD', 'TX1003047'),(2, '2700.00', 'USD', 'TX1003048');
```


Если требуется учитывать ограничения уникальности на столбцы БД используется правило `db-constraints-rules.red`:

```
section_name: [
    transactions: [account_id] 
    banks: [bank branch_code]
] 
```

На JSON оно не оказывает влияние:
```
{
   "owner_name": "John Doe",
   "account_id": "94967295",
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "amount": "1200.00",
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "amount": "2700.00",
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

Однако при генерации SQL генерируется запрос с учетом ограничений уникальности:
```
INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', '94967295', '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("bank_name", "branch_code", "account_type")
 VALUES ('Bank of America', '001', 'Personal')
 ON CONFLICT ("bank", "branch_code")
 DO UPDATE SET "bank_name" = EXCLUDED."bank_name", "branch_code" = EXCLUDED."branch_code", "account_type" = EXCLUDED."account_type";

INSERT INTO transactions ("amount", "currency", "tid")
 VALUES ('1200.00', 'USD', 'TX1003047'),('2700.00', 'USD', 'TX1003048')
 ON CONFLICT ("account_id")
 DO UPDATE SET "amount" = EXCLUDED."amount", "currency" = EXCLUDED."currency", "tid" = EXCLUDED."tid";
```

По умолчанию все значения из XML извлекаются как текстовые.
Правила приведения типов задаются в `tags-casting-rules.red`.
```
section_name: [
    integer-list: [[to-integer to-float] [account_id amount]] 
    float-list: [[to-float] []] 
    bool-list: [[reduce to-word] []]
] 
```

Более подробно правила приведения типов рассмотрены в статье https://redata.dev/smartxml/docs/type-conversion-in-xml-documents.html


JSON:
```
{
   "owner_name": "John Doe",
   "account_id": 94967295,
   "phone_number": "+1234567890",
   "email": "johndoe@example.com",
   "banks": [
      {
         "bank_name": "Bank of America",
         "branch_code": "001",
         "account_type": "Personal"
      }
   ],
   "transactions": [
      {
         "amount": 1200,
         "currency": "USD",
         "tid": "TX1003047"
      },
      {
         "amount": 2700,
         "currency": "USD",
         "tid": "TX1003048"
      }
   ]
}
```

SQL:
```

INSERT INTO bank_transaction ("owner_name", "account_id", "phone_number", "email")
 VALUES ('John Doe', 94967295, '+1234567890', 'johndoe@example.com');

INSERT INTO banks ("bank_name", "branch_code", "account_type")
 VALUES ('Bank of America', '001', 'Personal');

INSERT INTO transactions ("amount", "currency", "tid")
 VALUES (1200, 'USD', 'TX1003047'),(2700, 'USD', 'TX1003048');
```

Правила `complex-extract-rules.red` описаны в https://redata.dev/smartxml/docs/type-conversion-in-xml-documents.html


Структура `config.txt`:

```
; allowed combinations: true false "..." none

root-xml-folder: "" ; if xml_path in DB is relative
xml-filling-stat: true ; table: filling_percent_stat should exists
ignore-namespaces: true
ignore-tag-attributes: true
use-same-morphology-for-same-file-name-pattern: false
skip-schema-version-tag: true
use-same-morphology-for-all-files-in-folder: false
delete-data-before-insert: none
connect-to-db-at-project-opening: false
source-database: "PostgreSQL" ; available values: PostgreSQL/SQLite
target-database: "PostgreSQL" ; available values: PostgreSQL/SQLite/NoSQL

bot-chatID: ""
bot-token: ""
telegram-notifications: none

db-driver: ""
db-server: "127.0.0.1"
db-port: "5432"
db-name: "test"
db-user: "postgres"
db-pass: ""

sqlite-driver-name: none
sqlite-db-path: none

nosql-url: ""
append-subsection_name-to-nosql-url: true
nosql-login: "root"
nosql-pass: ""
```


`job.txt` is necessary if references to XML are located in the database

```
job-number: 1 ; default where condition block number
xml-table-name: "xml_files" ; name of table where full path to XML is store
limit: 1000 
order_by: "id DESC" 
select-fields: [
    id xml_path ; columns id and xml_path is required in xml_files table!
] 
where-condition: [
   [
    job_numnber: [1 2 3]
    doc_date: [2024-01-01 2030-01-01] ; date range
    region: ["USA"]
    doc_type: "type_a" ; "type_a" "type_b" "type_c"
    parsing_status: "NULL" ; "NULL" "NOT NULL" "someWord" or logical: true\false
    action_type: "data_insert" ; or data_update if doc only patch table
   ]          

   [
    job_numnber: [5 6 7]
    doc_date: [2024-01-01 2030-01-01] ; date range
    region: ["Europe" "Australia"]
    doc_type: "type_a" ; "type_a" "type_b" "type_c"
    parsing_status: "NULL" ; "NULL" ; "NULL" "NOT NULL" "someWord" or logical: true\false
    some_other_column: "NULL" ; "NULL" ; "NULL" "NOT NULL" "someWord" or logical: true\false
    action_type: "data_insert" ; or data_update if doc only patch table
   ]  
]
```

The structure of the assignments is described in more detail in the article https://redata.dev/smartxml/docs/jobs-settings.html

