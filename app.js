const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const {format, isValid} = require('date-fns')

const path = require('path')

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

const app = express()
app.use(express.json())

const initilazeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Runnin at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB error: ${error.message}`)
  }
}

initilazeDbAndServer()

const conversatioDbObjectToResponseOject = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  }
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasPriorityAndStatusProperty = requestQuery => {
  return requestQuery.priority !== undefined && requestQuery.status
}

const hasSearchQuery = requestQuery => {
  return requestQuery.search_q !== undefined
}

const hasCategoryAndStatus = requestQuery => {
  return requestQuery.category !== undefined && requestQuery.status
}

const hasCategory = requestQuery => {
  return requestQuery.category !== undefined
}

const hasCategoryAndLearing = requestQuery => {
  return requestQuery.category !== undefined && requestQuery.priority
}

const checkRequestsBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const categoryIsInArray = categoryArray.includes(category)
    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }
  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const statusIsInArray = statusArray.includes(status)

    if (statusIsInArray === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const priorityIsInArray = priorityArray.includes(priority)

    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }
  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)
      const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
      console.log(formatedDate)

      const isValidDate = isValid(formatedDate)
      if (isValidDate === true) {
        request.dueDate = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (error) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
    request.id = id
    request.todo = todo

    request.todoId = todoId
    next()
  }
}

//GET API based on the Querys
app.get('/todos/', async (request, response) => {
  const {status, priority, category, search_q = ''} = request.query

  switch (true) {
    case hasStatusProperty(request.query):
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        const getStatus = `
        SELECT
        *
        FROM
        todo
        WHERE
        status = '${status}';`
        const statusGet = await db.all(getStatus)
        response.send(
          statusGet.map(eachrow => conversatioDbObjectToResponseOject(eachrow)),
        )
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case hasPriorityProperty(request.query):
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        const getPriorityBasedQuery = `
      SELECT
      *
      FROM
      todo
      WHERE
      priority = '${priority}';`
        const getPriority = await db.all(getPriorityBasedQuery)
        response.send(
          getPriority.map(eachrow =>
            conversatioDbObjectToResponseOject(eachrow),
          ),
        )
      } else if (
        priority !== 'HIGH' ||
        priority !== 'MEDIUM' ||
        priority !== 'LOW'
      ) {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case hasPriorityAndStatusProperty(request.query):
      const getPriorityAndStatusQuery = `
     SELECT
     *
     FROM 
      todo
    WHERE
     priority = '${priority}'
     AND status = '${status}';`
      const getPriorityAndStatus = await db.all(getPriorityAndStatusQuery)
      response.send(
        getPriorityAndStatus.map(eachrow =>
          conversatioDbObjectToResponseOject(eachrow),
        ),
      )
      break
    case hasSearchQuery(request.query):
      const getSearchQuery = `
      SELECT 
      *
      FROM 
      todo
      WHERE
      todo LIKE '%${search_q}%';`
      const getSearch = await db.all(getSearchQuery)
      response.send(
        getSearch.map(eachrow => conversatioDbObjectToResponseOject(eachrow)),
      )
      break
    case hasCategoryAndStatus(request.query):
      const getCategoryandStatus = `
    SELECT
    *
    FROM
     todo
    WHERE
    category = '${category}'
    AND status = '${status}';`
      const getCategoryStatus = await db.all(getCategoryandStatus)
      response.send(
        getCategoryStatus.map(eachrow =>
          conversatioDbObjectToResponseOject(eachrow),
        ),
      )
      break
    case hasCategory(request.query):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        const getCategoryQuery = `
       SELECT
        *
       FROM
        todo
       WHERE
        category = '${category}';`
        const getCategory = await db.all(getCategoryQuery)
        response.send(
          getCategory.map(eachrow =>
            conversatioDbObjectToResponseOject(eachrow),
          ),
        )
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case hasCategoryAndLearing(request.query):
      const getCategoryAndPriority = `
    SELECT 
     *
    FROM
     todo
    WHERE
     category = '${category}'
     AND priority = '${priority}';`
      const categoryAndPriority = await db.all(getCategoryAndPriority)
      response.send(
        categoryAndPriority.map(eachrow =>
          conversatioDbObjectToResponseOject(eachrow),
        ),
      )
  }
})

//GET API based on the ID

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoIDQuery = `
  SELECT
  *
  FROM 
   todo
  WHERE
   id = ${todoId};`
  const getTodo = await db.get(getTodoIDQuery)
  response.send(conversatioDbObjectToResponseOject(getTodo))
})

//GET APT based on date

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const formatDate = format(new Date(date), 'yyyy-MM-dd')
  const result = isValid(new Date(formatDate))
  if (result === true) {
    const getTodoDateQuery = `
    SELECT
     *
    FROM
     todo
    WHERE
     due_date = '${formatDate}';`
    const getDateTodo = await db.all(getTodoDateQuery)
    if (getDateTodo.length > 0) {
      response.send(
        getDateTodo.map(eachrow => conversatioDbObjectToResponseOject(eachrow)),
      )
    } else {
      response.status(400)
      response.send('Invalid Due Date')
    }
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

//POST API

app.post('/todos/', checkRequestsBody, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request
  const addTodoQuery = `
  INSERT INTO
   todo(id, todo, priority, status, category, due_date)
  VALUES
     (${id},
     '${todo}',
     '${priority}',
     '${status}',
     '${category}',
     '${dueDate}');`
  const createNewuser = await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', checkRequestsBody, async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request

  switch (true) {
    case status !== undefined:
      const updateStatusQuery = `
     UPDATE todo
     SET
      status = '${status}'
     WHERE
      id = ${todoId}; `
      await db.run(updateStatusQuery)
      response.send('Status Updated')
      break
    case priority !== undefined:
      const updatePriorityQuery = `
    UPDATE
     todo
    SET
     priority = '${priority}'
    WHERE
     id = '${todoId}'; `
      await db.run(updatePriorityQuery)
      response.send('Priority Updated')
      break
    case category !== undefined:
      const updateCategoryQuery = `
    UPDATE
     todo
    SET
     category = '${category}'
    WHERE
     id = ${todoId};`
      await db.run(updateCategoryQuery)
      response.send('Category Updated')
      break
    case todo !== undefined:
      const updateTodoQuery = `
    UPDATE
     todo
    SET
     todo = '${todo}'
    WHERE
    id = ${todoId};`
      await db.run(updateTodoQuery)
      response.send('Todo Updated')
      break
    case dueDate !== undefined:
      const updateDateQuery = `
     UPDATE
      todo
    SET
     due_date = '${dueDate}'
    WHERE
     id = ${todoId};`
      await db.run(updateDateQuery)
      response.send('Due Date Updated')
  }
})
// DELETE API based on the Id

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTheTodoRow = `
    DELETE FROM todo
    WHERE id = ${todoId};`
  await db.run(deleteTheTodoRow)
  response.send('Todo Deleted')
})

module.exports = app
