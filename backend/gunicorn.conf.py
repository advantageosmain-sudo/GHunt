import os

bind = '0.0.0.0:' + os.environ.get('PORT', '8080')
workers = 1
worker_class = 'gthread'
threads = 4
timeout = 100
accesslog = None
errorlog = '-'
loglevel = 'warning'
limit_request_line = 2048
limit_request_fields = 30
limit_request_field_size = 4096
